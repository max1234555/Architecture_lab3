import { calculateTotal, type CartLine } from "../shared/calculateTotal.ts";
import { OrderService } from "../orders/OrderService.ts";
import { runtimeConfig } from "../config.ts";

export type CheckoutRequest = {
  orderId: string;
  paymentToken: string;
  currency: string;
  lines: CartLine[];
};

export class CheckoutController {
  private readonly orders: OrderService;

  constructor(orders = new OrderService()) {
    this.orders = orders;
  }

  async checkout(request: CheckoutRequest) {
    // Викликаємо чисту функцію розрахунку total, передаючи конфіг явно
    const total = calculateTotal(request.lines, runtimeConfig);

    const order = await this.orders.placeOrder(
      request.orderId,
      request.lines,
      total,
      request.paymentToken,
      request.currency,
    );

    return {
      orderId: order.id,
      status: order.status,
      total: order.total,
      paymentStatus: order.paymentStatus,
    };
  }
}