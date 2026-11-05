import { database } from "../database.ts";
import type { CartLine } from "../shared/calculateTotal.ts";
import { PaymentsService } from "../payments/public/PaymentsService.ts";
import { StockRepository } from "../inventory/StockRepository.ts";

export class OrderService {
  private readonly payments: PaymentsService;
  private readonly stock: StockRepository;

  constructor(
    payments = new PaymentsService(),
    stock = new StockRepository()
  ) {
    this.payments = payments;
    this.stock = stock;
  }

  async placeOrder(orderId: string, lines: CartLine[], total: number, paymentToken: string, currency: string) {
    // 1. Резервуємо товар через власника інвентарю
    this.stock.reserve(lines);

    // 2. Створюємо замовлення зі статусом "created"
    database.orders.set(orderId, { id: orderId, status: "created", total });

    // 3. Викликаємо платіж через публічний контракт Payments (без знання про Stripe)
    const paymentResult = await this.payments.authorizePayment({
      orderId,
      paymentToken,
      currency,
      amount: total,
    });

    // 4. Оновлюємо статус замовлення на основі нормалізованого результату
    const order = database.orders.get(orderId)!;
    order.paymentStatus = paymentResult.status;
    
    if (paymentResult.status === "paid") {
      order.status = "confirmed";
    } else if (paymentResult.status === "processing") {
      order.status = "payment_processing";
    } else {
      order.status = "payment_pending";
    }

    return { ...order };
  }
}