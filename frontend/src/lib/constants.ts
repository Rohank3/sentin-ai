/**
 * Centralized Application Constants (Frontend)
 * Import APP_NAME and base configurations from here to prevent hardcoding.
 */

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Sentin AI";
export const APP_TAGLINE = "Autonomous PayPal Dispute Command Center & Risk Arbitrator";

const getApiBaseUrl = (): string => {
  const raw = process.env.NEXT_PUBLIC_API_URL;
  if (!raw || raw.trim() === "") {
    if (typeof window !== "undefined" && window.location.hostname.includes("onrender.com")) {
      return "https://sentin-ai-backend.onrender.com";
    }
    return "http://localhost:8000";
  }
  const trimmed = raw.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed.replace(/\/+$/, "");
  }
  return `https://${trimmed}`.replace(/\/+$/, "");
};

export const API_BASE_URL = getApiBaseUrl();

export const DISPUTE_STATUS = {
  OPEN: "OPEN",
  UNDER_REVIEW: "UNDER_REVIEW",
  WAITING_FOR_BUYER: "WAITING_FOR_BUYER_RESPONSE",
  WAITING_FOR_SELLER: "WAITING_FOR_SELLER_RESPONSE",
  RESOLVED: "RESOLVED",
  CLOSED: "CLOSED",
} as const;

export const RESOLUTION_ACTIONS = {
  CONTEST: "CONTEST",
  SETTLE: "SETTLE",
  REFUND: "REFUND",
} as const;
