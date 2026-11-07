"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { StatsOverview } from "@/components/StatsOverview";
import { DemoControlBar } from "@/components/DemoControlBar";
import { DisputeStudio } from "@/components/DisputeStudio";
import { DisputeDetailDrawer } from "@/components/DisputeDetailDrawer";
import {
  api,
  DisputeSummary,
  DisputeDetail,
  StatsResponse,
  SellerSummary,
} from "@/lib/api";
import {
  RefreshCw,
  Store,
  Radio,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  WifiOff,
} from "lucide-react";

// Static fallback data ensuring the dashboard is 100% operational with zero hydration mismatches
const FALLBACK_DISPUTES: DisputeSummary[] = [
  {
    id: "disp-101",
    paypal_dispute_id: "PP-D-849201",
    seller_id: "seller_acme",
    seller_name: "Apex Electronics",
    customer_id: "cust_john_doe",
    customer_email: "johndoe.shopper@example.com",
    amount: 189.99,
    currency: "USD",
    reason: "ITEM_NOT_RECEIVED",
    status: "UNDER_REVIEW",
    ai_decision: {
      recommended_action: "CONTEST",
      win_probability: 0.94,
      expected_value: 163.59,
      reasoning:
        "Carrier tracking (UPS #1Z999AA10123456784) confirms signed delivery at buyer address. Fulfills PayPal Seller Protection prerequisites.",
      auto_execute: true,
      confidence_factors: [
        "Direct signature obtained on delivery",
        "Fulfillment initiated within 24h SLA",
        "Buyer dispute frequency normal",
      ],
    },
    auto_executed: true,
    action_taken: "EVIDENCE_SUBMITTED",
    created_at: "2026-10-31T14:30:00.000Z",
    updated_at: "2026-10-31T14:30:00.000Z",
  },
  {
    id: "disp-102",
    paypal_dispute_id: "PP-D-849202",
    seller_id: "seller_nexus",
    seller_name: "Nexus Direct Store",
    customer_id: "cust_fraud_user",
    customer_email: "repeat.claimant@example.com",
    amount: 420.0,
    currency: "USD",
    reason: "SIGNIFICANTLY_NOT_AS_DESCRIBED",
    status: "OPEN",
    ai_decision: {
      recommended_action: "CONTEST",
      win_probability: 0.78,
      expected_value: 298.6,
      reasoning:
        "Buyer is flagged for repeat refund claims (3 in past 90 days). Store policy requires merchandise return prior to refund authorization.",
      auto_execute: false,
      confidence_factors: [
        "Buyer risk score elevated (0.88)",
        "Serial claim behavior detected",
        "High transaction value ($420.00)",
      ],
    },
    auto_executed: false,
    action_taken: null,
    created_at: "2026-10-31T11:15:00.000Z",
    updated_at: "2026-10-31T11:15:00.000Z",
  },
  {
    id: "disp-103",
    paypal_dispute_id: "PP-D-849203",
    seller_id: "seller_acme",
    seller_name: "Apex Electronics",
    customer_id: "cust_alice_smith",
    customer_email: "alice.shopper@example.com",
    amount: 24.5,
    currency: "USD",
    reason: "ITEM_NOT_RECEIVED",
    status: "RESOLVED",
    ai_decision: {
      recommended_action: "REFUND",
      win_probability: 0.2,
      expected_value: -24.5,
      reasoning:
        "Tracking shows weather delay in sorting depot. EV math confirms settling $24.50 avoids guaranteed $15 dispute fee penalty.",
      auto_execute: true,
      confidence_factors: [
        "USPS weather exception verified",
        "Under $30 instant concession threshold",
        "Dispute fee avoided",
      ],
    },
    auto_executed: true,
    action_taken: "REFUNDED",
    created_at: "2026-10-31T09:00:00.000Z",
    updated_at: "2026-10-31T09:00:00.000Z",
  },
];

const FALLBACK_STATS: StatsResponse = {
  total_disputes: 3,
  open_disputes: 2,
  total_amount_at_risk: 609.99,
  total_amount_protected: 214.49,
  win_rate: 0.88,
  auto_executed_count: 2,
  avg_resolution_time_hours: 1.8,
  currency: "USD",
};

const FALLBACK_SELLERS: SellerSummary[] = [
  {
    id: "seller_acme",
    name: "Apex Electronics",
    dispute_count: 2,
    win_rate: 0.91,
    total_amount_at_risk: 189.99,
  },
  {
    id: "seller_nexus",
    name: "Nexus Direct Store",
    dispute_count: 1,
    win_rate: 0.78,
    total_amount_at_risk: 420.0,
  },
];

function computeFallbackStats(disputeList: DisputeSummary[]): StatsResponse {
  const total = disputeList.length;
  const open = disputeList.filter((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW").length;
  const risk = disputeList
    .filter((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW")
    .reduce((acc, d) => acc + (d.amount || 0), 0);
  const protectedAmt = disputeList
    .filter(
      (d) =>
        d.action_taken !== "REFUNDED" &&
        (d.action_taken === "EVIDENCE_SUBMITTED" ||
          (d.status === "RESOLVED" && d.ai_decision?.recommended_action === "CONTEST"))
    )
    .reduce((acc, d) => acc + (d.amount || 0), 0);
  const won = disputeList.filter(
    (d) =>
      d.status === "RESOLVED" &&
      d.action_taken !== "REFUNDED" &&
      (d.action_taken === "EVIDENCE_SUBMITTED" || d.ai_decision?.recommended_action === "CONTEST")
  ).length;
  const autoExec = disputeList.filter((d) => d.auto_executed).length;
  return {
    total_disputes: total,
    open_disputes: open,
    total_amount_at_risk: risk,
    total_amount_protected: protectedAmt,
    win_rate: total > 0 ? won / total : 0,
    auto_executed_count: autoExec,
    avg_resolution_time_hours: 1.8,
    currency: "USD",
  };
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [disputes, setDisputes] = useState<DisputeSummary[]>(FALLBACK_DISPUTES);
  const [stats, setStats] = useState<StatsResponse | null>(FALLBACK_STATS);
  const [sellers, setSellers] = useState<SellerSummary[]>(FALLBACK_SELLERS);
  const [selectedSeller, setSelectedSeller] = useState<string>("ALL");
  const [loading, setLoading] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Live polling state
  const [autoPolling, setAutoPolling] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>("");
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "info" | "error";
    text: string;
  } | null>(null);

  // Inspection Drawer State
  const [selectedDispute, setSelectedDispute] = useState<DisputeDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Concurrency & stale request guard refs
  const requestIdRef = useRef(0);
  const isFetchingRef = useRef(false);
  const displayedSellerKeyRef = useRef<string | null>(null);

  useEffect(() => {
    setMounted(true);
    setLastSyncTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
  }, []);

  // Auto-dismiss toast after 5s with cleanup
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Load sellers
  useEffect(() => {
    async function loadSellers() {
      try {
        const res = await api.getSellers();
        if (res && res.sellers && res.sellers.length > 0) {
          setSellers(res.sellers);
        }
      } catch (err: unknown) {
        console.warn("Backend offline; using local mock sellers:", err);
      }
    }
    loadSellers();
  }, []);

  const fetchData = useCallback(async () => {
    isFetchingRef.current = true;
    setLoading(true);
    const currentReqId = ++requestIdRef.current;
    try {
      const sellerIdParam = selectedSeller === "ALL" ? undefined : selectedSeller;
      const [disputesRes, statsRes] = await Promise.all([
        api.getDisputes({ seller_id: sellerIdParam }),
        api.getStats(sellerIdParam),
      ]);
      if (currentReqId !== requestIdRef.current) return;
      setDisputes(disputesRes.disputes);
      setStats(statsRes);
      displayedSellerKeyRef.current = selectedSeller;
      setIsOfflineMode(false);
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } catch {
      if (currentReqId !== requestIdRef.current) return;
      setIsOfflineMode(true);
      // Rebuild fallback when displayedSellerKey differs from selectedSeller
      if (displayedSellerKeyRef.current !== selectedSeller) {
        let filtered = FALLBACK_DISPUTES;
        if (selectedSeller !== "ALL") {
          filtered = FALLBACK_DISPUTES.filter((d) => d.seller_id === selectedSeller);
        }
        setDisputes(filtered);
        setStats(computeFallbackStats(filtered));
        displayedSellerKeyRef.current = selectedSeller;
      }
      setLastSyncTime(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    } finally {
      if (currentReqId === requestIdRef.current) {
        setLoading(false);
        isFetchingRef.current = false;
      }
    }
  }, [selectedSeller]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live Polling with overlap prevention
  useEffect(() => {
    if (!autoPolling) return;
    const interval = setInterval(() => {
      if (!isFetchingRef.current) {
        fetchData();
      }
    }, 8000);
    return () => clearInterval(interval);
  }, [autoPolling, fetchData]);

  const handleSelectDispute = async (item: DisputeSummary | string) => {
    const disputeId = typeof item === "string" ? item : item.id;
    try {
      const detail = await api.getDispute(disputeId);
      setSelectedDispute(detail);
      setIsDrawerOpen(true);
    } catch {
      // Look up fixture by disputeId in FALLBACK_DISPUTES
      const fallbackMatch = FALLBACK_DISPUTES.find((d) => d.id === disputeId);
      if (fallbackMatch) {
        const fallbackDetail: DisputeDetail = {
          ...fallbackMatch,
          ev_breakdown: {
            expected_value_contest: fallbackMatch.amount * 0.85,
            expected_value_settle: -fallbackMatch.amount,
            optimal_action: fallbackMatch.amount > 100 ? "CONTEST" : "REFUND",
            savings: fallbackMatch.amount * 0.4,
            dispute_fee: 15.0,
            cost_to_contest: 6.5,
          },
          evidence: {
            policies_found: [
              "Orders confirmed delivered by carrier tracking with signature are protected under Seller Protection.",
            ],
            pod_records: [
              {
                tracking_number: "1Z999AA10123456784",
                carrier: "UPS",
                status: "DELIVERED",
                delivery_notes: "Signed by recipient",
                signature_confirmed: true,
              },
            ],
            customer_history: {
              total_orders: 8,
              total_spend: 1240.0,
              prior_disputes: 0,
              risk_score: 0.05,
            },
          },
          audit_log: [
            {
              action: "DISPUTE_INGESTED",
              details: "Ingested via PayPal Webhook v1",
              timestamp: fallbackMatch.created_at,
            },
            {
              action: "AI_EVALUATION_COMPLETED",
              details: "Win probability calculated at 94%",
              timestamp: fallbackMatch.created_at,
            },
          ],
        };
        setSelectedDispute(fallbackDetail);
        setIsDrawerOpen(true);
      } else {
        setToastMessage({
          type: "error",
          text: `Failed to load details for dispute #${disputeId}. Check backend connection.`,
        });
      }
    }
  };

  const handleTriageDispute = async (disputeId: string) => {
    try {
      await api.triggerTriage(disputeId);
    } catch {
      setToastMessage({
        type: "error",
        text: `AI Triage failed for dispute #${disputeId}. Check AI Engine connectivity.`,
      });
      return;
    }

    setToastMessage({
      type: "success",
      text: `AI Triage completed for dispute #${disputeId}`,
    });

    try {
      await fetchData();
      if (selectedDispute && selectedDispute.id === disputeId) {
        const updated = await api.getDispute(disputeId);
        setSelectedDispute(updated);
      }
    } catch (refreshErr) {
      console.warn("Failed to refresh dispute list after triage:", refreshErr);
    }
  };

  const currentSellerName =
    selectedSeller === "ALL"
      ? null
      : sellers.find((s) => s.id === selectedSeller)?.name || selectedSeller;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md text-xs font-semibold animate-slideUp ${
            toastMessage.type === "success"
              ? "bg-white text-emerald-800 border-emerald-200 shadow-emerald-500/10"
              : toastMessage.type === "error"
              ? "bg-white text-rose-800 border-rose-200 shadow-rose-500/10"
              : "bg-white text-blue-800 border-blue-200 shadow-blue-500/10"
          }`}
        >
          <div className="flex items-center gap-2">
            {toastMessage.type === "error" ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            ) : toastMessage.type === "info" ? (
              <Info className="w-4 h-4 shrink-0 text-blue-600" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            )}
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
            className="p-1 hover:text-slate-900 active:text-slate-700 text-slate-400 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Offline Mode Indicator */}
      {isOfflineMode && (
        <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl flex items-center justify-between text-xs text-blue-900 shadow-sm">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-[#0070ba] shrink-0" />
            <span>
              <strong>Local Interactive Mode Active:</strong> Dashboard running with resilient mock fallbacks. Connect FastAPI on port 8000 for live PayPal Sandbox integration.
            </span>
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="flex items-center gap-1 font-bold underline hover:text-blue-700 active:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed shrink-0 ml-2 text-[#0070ba] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba] rounded px-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>{loading ? "Reconnecting..." : "Reconnect"}</span>
          </button>
        </div>
      )}

      {/* Global Filter Bar: Marketplace Merchant Selector & Live Polling */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 text-[#0070ba] border border-blue-100">
            <Store className="w-4 h-4 text-[#0070ba]" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <label htmlFor="merchant-filter" className="text-xs font-semibold text-slate-600">
              Active Merchant View:
            </label>
            <select
              id="merchant-filter"
              aria-label="Filter disputes by merchant"
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="bg-white border border-slate-300 text-slate-800 font-semibold text-xs rounded-lg px-2.5 py-1.5 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba]"
            >
              <option value="ALL">All Marketplace Merchants (Aggregate)</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.dispute_count} claims &bull; ${(s.total_amount_at_risk || 0).toFixed(0)} exposure)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Polling Toggle */}
        <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
          <button
            onClick={() => setAutoPolling(!autoPolling)}
            aria-pressed={autoPolling}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba] active:scale-[0.98] ${
              autoPolling
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm hover:bg-emerald-100"
                : "bg-white hover:bg-slate-50 text-slate-600 border-slate-200 shadow-sm hover:border-slate-300"
            }`}
            title="Toggle automatic 8s webhook polling"
          >
            <Radio className={`w-3.5 h-3.5 ${autoPolling ? "animate-pulse text-emerald-600" : ""}`} />
            <span className="font-semibold">
              {autoPolling ? "Live Polling On (8s)" : "Auto-Poll Off"}
            </span>
          </button>
          {mounted && lastSyncTime && (
            <span className="text-[11px] text-slate-500 hidden md:inline font-mono" suppressHydrationWarning>
              Synced {lastSyncTime}
            </span>
          )}
        </div>
      </div>

      {/* 1. Executive Performance Metrics */}
      <StatsOverview
        stats={stats}
        loading={loading}
        onRefresh={fetchData}
        sellerFilter={selectedSeller}
        sellerName={currentSellerName}
        isOffline={isOfflineMode}
      />

      {/* 2. 1-Click Hackathon Pitch Scenario Injector */}
      <DemoControlBar
        onScenarioInjected={fetchData}
        onSelectDisputeId={(id) => handleSelectDispute(id)}
      />

      {/* 3. AG Studio / AG Grid Command Table */}
      <DisputeStudio
        disputes={disputes}
        loading={loading}
        onSelectDispute={handleSelectDispute}
        onTriageDispute={handleTriageDispute}
        onRefresh={fetchData}
      />

      {/* 4. Inspection Drawer */}
      <DisputeDetailDrawer
        dispute={selectedDispute}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onActionComplete={fetchData}
      />
    </div>
  );
}
