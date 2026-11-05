export type PaymentStatus = "paid" | "processing" | "failed" | "pending";

export function mapProviderStateToSystemStatus(state: string): PaymentStatus {
  switch (state) {
    case "succeeded":
      return "paid";
    case "processing":
    case "requires_action":
      return "processing";
    case "declined":
    case "failed":
      return "failed";
    default:
      return "pending";
  }
}