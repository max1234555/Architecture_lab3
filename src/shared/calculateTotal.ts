export type CartLine = {
  productId: string;
  unitPrice: number;
  quantity: number;
  lineTotal?: number;
};

// Чиста функція: приймає дані і конфіг явно, не мутує вхідні масиви, не пише в глобальний лог
export function calculateTotal(
  lines: CartLine[],
  config: { taxRate: number; discountPercent: number }
): number {
  let subtotal = 0;

  for (const line of lines) {
    // Створюємо нове значення для розрахунку, не змінюючи оригінальний об'єкт line
    subtotal += line.unitPrice * line.quantity;
  }

  const discounted = subtotal * (1 - config.discountPercent / 100);
  const total = Number((discounted * (1 + config.taxRate)).toFixed(2));
  return total;
}