/**
 * Typed API Client for Sentin AI Backend.
 * Adheres strictly to .contracts/API_CONTRACT.md.
 */

import { API_BASE_URL } from "./constants";

export interface AIDecision {
  recommended_action: "CONTEST" | "SETTLE" | "REFUND";
  win_probability: number;
  expected_value: number;
  reasoning: string;
  auto_execute: boolean;
  confidence_factors: string[];
}

export interface EVResult {
  expected_value_contest: number;
  expected_value_settle: number;
  optimal_action: "CONTEST" | "SETTLE" | "REFUND";
  savings: number;
  dispute_fee: number;
  cost_to_contest: number;
}

export interface DisputeSummary {
  id: string;
  paypal_dispute_id: string;
  seller_id: string;
  seller_name: string;
  customer_id: string;
  customer_email: string;
  amount: number;
  currency: string;
  reason: string;
  status: string;
  ai_decision?: AIDecision | null;
  auto_executed: boolean;
  action_taken?: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceSnapshot {
  policies_found: string[];
  pod_records: Array<{
    tracking_number: string;
    carrier: string;
    status: string;
    delivery_notes?: string;
    signature_confirmed?: boolean;
  }>;
  customer_history: {
    total_orders?: number;
    total_spend?: number;
    prior_disputes?: number;
    risk_score?: number;
    flagged_for_abuse?: boolean;
  };
}

export interface AuditLogItem {
  action: string;
  details: string;
  timestamp: string;
}

export interface DisputeDetail extends DisputeSummary {
  ev_breakdown?: EVResult | null;
  evidence: EvidenceSnapshot;
  audit_log: AuditLogItem[];
}

export interface DisputeListResponse {
  disputes: DisputeSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface StatsResponse {
  total_disputes: number;
  open_disputes: number;
  total_amount_at_risk: number;
  total_amount_protected: number;
  win_rate: number;
  auto_executed_count: number;
  avg_resolution_time_hours: number;
  currency: string;
}

export interface SimulateRequest {
  scenario_type:
    | "INR_WITH_TRACKING"
    | "INR_NO_TRACKING"
    | "SNAD_MINOR"
    | "SNAD_MAJOR"
    | "FRAUD_PATTERN"
    | "HIGH_VALUE";
  amount?: number;
  reason?: string;
  seller_id?: string;
  customer_email?: string;
  auto_triage?: boolean;
}

export interface SimulateResponse {
  dispute_id: string;
  paypal_dispute_id: string;
  scenario_type: string;
  status: string;
  message: string;
}

export interface SellerSummary {
  id: string;
  name: string;
  dispute_count: number;
  win_rate: number;
  total_amount_at_risk: number;
}

export interface SellerListResponse {
  sellers: SellerSummary[];
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL.replace(/\/+$/, "");
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    };

    try {
      const response = await fetch(url, { ...options, headers });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed with status ${response.status}: ${errorText}`
        );
      }
      return (await response.json()) as T;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown network error";
      console.warn(`[API] Fetch failed for ${url}: ${message}`);
      throw err;
    }
  }

  async getDisputes(params?: {
    seller_id?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<DisputeListResponse> {
    const query = new URLSearchParams();
    if (params?.seller_id) query.set("seller_id", params.seller_id);
    if (params?.status) query.set("status", params.status);
    if (params?.limit) query.set("limit", params.limit.toString());
    if (params?.offset) query.set("offset", params.offset.toString());

    const qs = query.toString() ? `?${query.toString()}` : "";
    return this.request<DisputeListResponse>(`/api/disputes${qs}`);
  }

  async getDispute(id: string): Promise<DisputeDetail> {
    return this.request<DisputeDetail>(`/api/disputes/${id}`);
  }

  async triggerTriage(id: string): Promise<unknown> {
    return this.request(`/api/disputes/${id}/triage`, {
      method: "POST",
    });
  }

  async executeAction(
    id: string,
    action: "CONTEST" | "SETTLE" | "REFUND",
    notes?: string
  ): Promise<{ dispute_id: string; action: string; status: string }> {
    return this.request<{ dispute_id: string; action: string; status: string }>(
      `/api/disputes/${id}/execute`,
      {
        method: "POST",
        body: JSON.stringify({ action, notes }),
      }
    );
  }

  async getStats(seller_id?: string): Promise<StatsResponse> {
    const qs = seller_id ? `?seller_id=${encodeURIComponent(seller_id)}` : "";
    return this.request<StatsResponse>(`/api/stats${qs}`);
  }

  async getSellers(): Promise<SellerListResponse> {
    return this.request<SellerListResponse>("/api/sellers");
  }

  async simulateDispute(scenario: SimulateRequest): Promise<SimulateResponse> {
    return this.request<SimulateResponse>("/api/simulate", {
      method: "POST",
      body: JSON.stringify(scenario),
    });
  }
}

export const api = new ApiService();
