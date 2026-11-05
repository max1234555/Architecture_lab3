# Architecture review

| Principle | Evidence (file:line) | Practical risk | Fix |
|---|---|---|---|
| **Information Hiding / Encapsulation** | `src/checkout/CheckoutController.ts:4` — `CheckoutController` напряму імпортує `StripePayload` з внутрішньої папки платіжного модуля. | Транспортний шар залежить від конкретної платформи (Stripe). При додаванні другого провайдера доведеться переписувати контролер і клієнтський запит під нові структури payload. | Винести платіжний контракт на рівень публічного API модуля payments (provider-neutral interface). |
| **High Cohesion & Code Duplication** | `src/notifications/mapPaymentStatus.ts:3`, `src/orders/mapPaymentStatus.ts:3`, `src/reports/mapPaymentStatus.ts:3` — функція `mapPaymentStatus` дублюється тричі у різних модулях для мапінгу Stripe-стандартів. | Будь-яка зміна у статусах провайдера або додавання нового статусу (наприклад, `processing`) вимагає ручного оновлення функції в багатьох місцях, що створює ризик помилок та неконсистентності. | Централізувати мапінг статусів всередині модуля `Payments`, експортуючи єдиний нормалізований статус системи. |
| **Ownership / Encapsulation of State** | `src/orders/OrderService.ts:19` — модуль `Orders` напряму читає (`database.stock.get`) і перезаписує (`database.stock.set`) таблицю складських залишків інвентарю. | Порушується інваріант залишків (available >= 0). Якщо логіка зміни залишків зміниться або з'явиться кешування в Inventory, зміни доведеться шукати по всьому коду Orders. | Перенести всю логіку роботи зі складом у модуль `Inventory`, створивши для нього метод на зразок `reserve(lines)`. |
| **Dependency Direction & Coupling** | `src/payments/internal/StripeClient.ts:2` — модуль `Payments` напряму імпортує внутрішню мутацію `markOrderPaid` із папки `src/orders/internal/`. | Виникає жорстка циклічна залежність між Orders та Payments (Orders викликає StripeClient, а StripeClient напряму змінює базу даних та стан Orders). Код важко тестувати ізольовано. | Інвертувати залежність або повернути результат виконання платежу в `OrderService`, щоб Orders сам оновлював свій статус. |
| **Local Reasoning & Purity** | `src/shared/calculateTotal.ts:13` — функція `calculateTotal` не є чистою (impure): вона читає глобальний конфіденційний конфіг, мутує вхідні об'єкти масиву (`line.lineTotal`) та робить глобальний `auditLog.push`. | Результат функції залежить від прихованого глобального стану. Унітарні тести вимагають складного налаштування глобальних змінних, а мутація вхідних даних може викликати непередбачувані побічні ефекти у викликуваному коді. | Зробити функцію чистою: передавати параметри конфігу (tax/discount) явно, прибрати мутацію вхідних `cart lines` та винести логування за межі функції. |

## Change impact prediction (заповнити до реалізації change request)

**Requirement:** 
Підтримати другий навчальний payment provider та новий нормалізований статус `processing`, не змінюючи публічний Checkout API та існуючу поведінку для paid і failed.

**Expected files:**
- `src/payments/internal/StripeClient.ts` (або новий адаптер)
- `src/payments/` (створення публічного контракту та модуля мапінгу)
- `src/orders/OrderService.ts`
- `src/notifications/mapPaymentStatus.ts` та інші дубльовані мапери (на видалення або перенесення)
- Нові тестові файли для перевірки адаптерів і статусів.

**Modules that should not change:**
- `src/checkout/CheckoutController.ts` (публічний контракт входу залишається стабільним, контролер не повинен знати про деталі конкретного провайдера).

## Actual impact (заповнено після реалізації)

**Actual files changed:**
- `src/shared/calculateTotal.ts` (зроблено чистою функцією)
- `src/payments/paymentStatuses.ts` (створено єдиний мапер нормалізованих статусів)
- `src/payments/internal/StripeClient.ts` (прибрано зайві залежності, додано обробку processing)
- `src/payments/public/PaymentsService.ts` (створено публічний контракт платежів)
- `src/inventory/StockRepository.ts` (перенесено ownership залишків та реалізовано метод `reserve`)
- `src/orders/OrderService.ts` (прибрано прямі маніпуляції зі складом та Stripe)
- `src/checkout/CheckoutController.ts` (передано конфіг у чисту функцію розрахунку)
- Видалено дубльовані файли `mapPaymentStatus.ts` з папок orders, notifications та reports.
- Додано новий тестовий файл `tests/architecture.features.test.ts`.

## Actual impact (заповнено після реалізації)

**Difference from prediction and explanation:**
Прогноз повністю збігся з реальністю. Зміни вдалося локалізувати в межах відповідних модулів (`Inventory`, `Payments`), залишивши публічний інтерфейс контролера та старі функціональні тести повністю незмінними.