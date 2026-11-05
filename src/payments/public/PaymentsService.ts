import { StripeClient, type StripePayload } from "../internal/StripeClient.ts";
import { mapProviderStateToSystemStatus, type PaymentStatus } from "../paymentStatuses.ts";

export type PaymentRequest = {
  orderId: string;
  paymentToken: string;
  currency: string;
  amount: number;
};

export type PaymentResult = {
  chargeId: string;
  status: PaymentStatus;
};

export class PaymentsService {
  private readonly stripe = new StripeClient();

  async authorizePayment(request: PaymentRequest): Promise<PaymentResult> {
    // Тут модулі за межами payments бачать лише нейтральний запит/відповідь
    const payload: StripePayload = {
      id: request.paymentToken,
      amount: Math.round(request.amount * 100),
      currency: request.currency,
      metadata: { orderId: request.orderId },
    };

    const response = await this.stripe.createCharge(payload);
    const status = mapProviderStateToSystemStatus(response.state);

    return {
      chargeId: response.charge_id,
      status,
    };
  }
}