import type {
  ClaimPaymentRequest,
  ClaimPaymentResponse,
} from "../types/index";
import { request } from "./client";

export function claimPayment(
  payload: ClaimPaymentRequest,
): Promise<ClaimPaymentResponse> {
  return request<ClaimPaymentResponse>("/payment/confirm", {
    method: "POST",
    body: payload,
  });
}
