"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  PackageCheck,
  PackageX,
  AlertOctagon,
  Zap,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  DollarSign,
  Sliders,
  X,
  Play,
  Activity,
} from "lucide-react";
import { api, SimulateRequest, SimulateResponse } from "@/lib/api";

interface DemoControlBarProps {
  onScenarioInjected: () => void;
  onSelectDisputeId?: (disputeId: string) => void;
}

interface ScenarioItem {
  id: SimulateRequest["scenario_type"];
  label: string;
  sublabel: string;
  amount: number;
  reason: string;
  icon: React.ElementType;
  badge: string;
  badgeColor: string;
  category: "auto" | "concession" | "gate";
  highlight: string;
}

export const DemoControlBar: React.FC<DemoControlBarProps> = ({
  onScenarioInjected,
  onSelectDisputeId,
}) => {
  const [injecting, setInjecting] = useState<string | null>(null);
  const [lastResponse, setLastResponse] = useState<SimulateResponse | null>(null);
  const [activeTab, setActiveTab] = useState<"ALL" | "AUTO" | "RISK">("ALL");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const customModalCloseBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!showCustomModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowCustomModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    customModalCloseBtnRef.current?.focus();
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCustomModal]);

  // Custom Simulator state
  const [customScenario, setCustomScenario] = useState<{
    scenario_type: SimulateRequest["scenario_type"];
    amount: number;
    reason: string;
    customer_email: string;
    seller_id: string;
    auto_triage: boolean;
  }>({
    scenario_type: "INR_WITH_TRACKING",
    amount: 149.99,
    reason: "ITEM_NOT_RECEIVED",
    customer_email: "test.buyer@example.com",
    seller_id: "seller_acme",
    auto_triage: true,
  });

  const scenarios: ScenarioItem[] = [
    {
      id: "INR_WITH_TRACKING",
      label: "INR + Verified Tracking",
      sublabel: "Signed carrier PoD matches delivery address",
      amount: 149.99,
      reason: "ITEM_NOT_RECEIVED",
      icon: PackageCheck,
      badge: "Auto-Contest",
      badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      category: "auto",
      highlight: "Elastic RAG + UPS PoD",
    },
    {
      id: "INR_NO_TRACKING",
      label: "INR Weather Delay",
      sublabel: "Sorting depot weather exception; low win odds",
      amount: 34.0,
      reason: "ITEM_NOT_RECEIVED",
      icon: PackageX,
      badge: "EV Concession",
      badgeColor: "bg-blue-50 text-[#0070ba] border-blue-200",
      category: "concession",
      highlight: "Fee Avoidance Math",
    },
    {
      id: "SNAD_MINOR",
      label: "Micro-SNAD Concession",
      sublabel: "Color shade difference on $19.50 order",
      amount: 19.5,
      reason: "SIGNIFICANTLY_NOT_AS_DESCRIBED",
      icon: Zap,
      badge: "Auto-Refund",
      badgeColor: "bg-sky-50 text-sky-700 border-sky-200",
      category: "concession",
      highlight: "Saves $15 PayPal Fee",
    },
    {
      id: "SNAD_MAJOR",
      label: "High Value Escrow",
      sublabel: "Damaged item claim on $899.00 order",
      amount: 899.0,
      reason: "SIGNIFICANTLY_NOT_AS_DESCRIBED",
      icon: AlertOctagon,
      badge: "Supervisor Gate",
      badgeColor: "bg-amber-50 text-amber-800 border-amber-200",
      category: "gate",
      highlight: ">$100 Policy Ceiling",
    },
    {
      id: "FRAUD_PATTERN",
      label: "Repeat Claim Abuse",
      sublabel: "Buyer risk score 0.88 with 3 prior disputes",
      amount: 250.0,
      reason: "ITEM_NOT_RECEIVED",
      icon: ShieldAlert,
      badge: "Fraud Ring Flag",
      badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
      category: "gate",
      highlight: "Buyer History Check",
    },
    {
      id: "HIGH_VALUE",
      label: "Enterprise Escrow",
      sublabel: "$1,250.00 claim requiring executive sign-off",
      amount: 1250.0,
      reason: "MERCHANDISE_OR_SERVICE_NOT_RECEIVED",
      icon: DollarSign,
      badge: "Executive Gate",
      badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
      category: "gate",
      highlight: "Dual Authorization",
    },
  ];

  const filteredScenarios = scenarios.filter((s) => {
    if (activeTab === "ALL") return true;
    if (activeTab === "AUTO") return s.category === "auto" || s.category === "concession";
    if (activeTab === "RISK") return s.category === "gate";
    return true;
  });

  const handleInject = async (
    scenarioType: SimulateRequest["scenario_type"],
    label: string,
    amount: number
  ) => {
    setInjecting(scenarioType);
    setLastResponse(null);
    try {
      const res = await api.simulateDispute({
        scenario_type: scenarioType,
        amount,
        auto_triage: true,
      });
      setLastResponse(res);
      onScenarioInjected();
      if (res && res.dispute_id && onSelectDisputeId) {
        onSelectDisputeId(res.dispute_id);
      }
    } catch {
      setLastResponse({
        dispute_id: "",
        paypal_dispute_id: "SIM-FAILED",
        scenario_type: scenarioType,
        status: "FAILED",
        message: `Simulation failed for ${label}. Check backend connection.`,
      });
    } finally {
      setInjecting(null);
    }
  };

  const handleCustomInject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      customScenario.amount < 1 ||
      customScenario.amount > 10000 ||
      isNaN(customScenario.amount)
    ) {
      setLastResponse({
        dispute_id: "",
        paypal_dispute_id: "VALIDATION_ERROR",
        scenario_type: customScenario.scenario_type,
        status: "FAILED",
        message: "Dispute amount must be between $1.00 and $10,000.00.",
      });
      return;
    }

    setInjecting("CUSTOM");
    setLastResponse(null);
    try {
      const res = await api.simulateDispute({
        scenario_type: customScenario.scenario_type,
        amount: Number(customScenario.amount),
        reason: customScenario.reason,
        seller_id: customScenario.seller_id,
        customer_email: customScenario.customer_email,
        auto_triage: customScenario.auto_triage,
      });
      setLastResponse(res);
      setShowCustomModal(false);
      onScenarioInjected();
      if (res && res.dispute_id && onSelectDisputeId) {
        onSelectDisputeId(res.dispute_id);
      }
    } catch {
      setLastResponse({
        dispute_id: "",
        paypal_dispute_id: "SIM-FAILED",
        scenario_type: customScenario.scenario_type,
        status: "FAILED",
        message: "Custom dispute simulation failed. Check backend connection.",
      });
    } finally {
      setInjecting(null);
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
      {/* Top Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-[#0070ba] rounded-lg border border-blue-100 shrink-0">
            <Activity className="w-5 h-5 text-[#0070ba]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                Dispute Simulation &amp; Sandbox Ingestion
              </h3>
              <span className="text-[10px] bg-blue-50 text-[#0070ba] font-semibold px-2 py-0.5 rounded-full border border-blue-200">
                Sandbox Test Bench
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulates incoming PayPal dispute events, queries store policy clauses and carrier Proof-of-Delivery, and calculates mathematical Expected Value.
            </p>
          </div>
        </div>

        {/* Action Controls: Tabs & Custom Trigger */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Custom Simulator Button */}
          <button
            onClick={() => setShowCustomModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0070ba] hover:bg-[#005ea6] active:bg-[#004b85] rounded-lg transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba]"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Custom Simulation</span>
          </button>

          {/* Category Tabs */}
          <div
            role="tablist"
            aria-label="Filter simulation scenarios"
            className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs"
          >
            <button
              role="tab"
              aria-selected={activeTab === "ALL"}
              onClick={() => setActiveTab("ALL")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba] active:scale-95 ${
                activeTab === "ALL"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All (6)
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "AUTO"}
              onClick={() => setActiveTab("AUTO")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba] active:scale-95 ${
                activeTab === "AUTO"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Autonomous
            </button>
            <button
              role="tab"
              aria-selected={activeTab === "RISK"}
              onClick={() => setActiveTab("RISK")}
              className={`px-2.5 py-1 rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba] active:scale-95 ${
                activeTab === "RISK"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Gated &amp; Risk
            </button>
          </div>
        </div>
      </div>

      {/* Live Injected Response Toast / Notification */}
      {lastResponse && (
        <div
          role="status"
          aria-live="polite"
          className={`flex items-center justify-between gap-3 text-xs p-3 rounded-lg border shadow-sm transition-all ${
            lastResponse.status === "FAILED"
              ? "bg-rose-50 text-rose-800 border-rose-200"
              : "bg-emerald-50 text-emerald-800 border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {lastResponse.status === "FAILED" ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <div>
              <span className="font-bold text-slate-900 mr-1.5 font-mono">
                {lastResponse.paypal_dispute_id}
              </span>
              <span>{lastResponse.message}</span>
            </div>
          </div>
          <button
            onClick={() => setLastResponse(null)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-slate-700 active:text-slate-900 p-1 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Scenario Buttons Grid (All 6 Scenarios) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {filteredScenarios.map((s) => {
          const IconComp = s.icon;
          const isCurrentInjecting = injecting === s.id;

          return (
            <button
              key={s.id}
              onClick={() => handleInject(s.id, s.label, s.amount)}
              disabled={injecting !== null}
              className="group relative flex flex-col justify-between p-3.5 rounded-xl bg-slate-50/70 hover:bg-white active:bg-slate-100 border border-slate-200 hover:border-[#0070ba]/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 text-left min-h-[140px]"
            >
              <div>
                <div className="w-full flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-md bg-white border border-slate-200 text-slate-600 group-hover:text-[#0070ba] group-hover:border-blue-200 transition-colors shadow-sm">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.badgeColor}`}
                  >
                    {s.badge}
                  </span>
                </div>

                <div className="font-bold text-xs text-slate-900 group-hover:text-[#0070ba] transition-colors">
                  {s.label}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                  {s.sublabel}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-200/80 w-full flex items-center justify-between text-[11px]">
                <span className="font-bold text-slate-900 font-mono">${s.amount.toFixed(2)}</span>
                <span className="text-[10px] text-slate-600 font-medium bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-sm">
                  {s.highlight}
                </span>
              </div>

              {isCurrentInjecting && (
                <div className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-[#0070ba] backdrop-blur-sm z-10 shadow-md">
                  <div className="w-4 h-4 border-2 border-[#0070ba] border-t-transparent rounded-full animate-spin"></div>
                  <span>Arbitrating...</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Simulator Modal */}
      {showCustomModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="custom-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowCustomModal(false);
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 text-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-[#0070ba]" />
                <h3 id="custom-modal-title" className="text-base font-bold text-slate-900">
                  Custom Sandbox Scenario Simulator
                </h3>
              </div>
              <button
                ref={customModalCloseBtnRef}
                onClick={() => setShowCustomModal(false)}
                aria-label="Close custom simulation modal"
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 active:bg-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCustomInject} className="space-y-3.5 text-xs">
              <div>
                <label htmlFor="custom-scenario-type" className="text-slate-700 font-semibold block mb-1">
                  Scenario Archetype
                </label>
                <select
                  id="custom-scenario-type"
                  value={customScenario.scenario_type}
                  onChange={(e) =>
                    setCustomScenario({
                      ...customScenario,
                      scenario_type: e.target.value as SimulateRequest["scenario_type"],
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba]"
                >
                  <option value="INR_WITH_TRACKING">INR with Carrier PoD</option>
                  <option value="INR_NO_TRACKING">INR Carrier Sorting Delay</option>
                  <option value="SNAD_MINOR">SNAD Minor Concession</option>
                  <option value="SNAD_MAJOR">SNAD Major Damaged Item</option>
                  <option value="FRAUD_PATTERN">Repeat Claim Abuse Risk</option>
                  <option value="HIGH_VALUE">High Value Escrow</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="custom-amount" className="text-slate-700 font-semibold block mb-1">
                    Dispute Amount ($ USD)
                  </label>
                  <input
                    id="custom-amount"
                    type="number"
                    step="0.01"
                    min="1"
                    max="10000"
                    value={customScenario.amount}
                    onChange={(e) =>
                      setCustomScenario({
                        ...customScenario,
                        amount: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba]"
                  />
                </div>

                <div>
                  <label htmlFor="custom-seller-id" className="text-slate-700 font-semibold block mb-1">
                    Merchant Store
                  </label>
                  <select
                    id="custom-seller-id"
                    value={customScenario.seller_id}
                    onChange={(e) =>
                      setCustomScenario({
                        ...customScenario,
                        seller_id: e.target.value,
                      })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba]"
                  >
                    <option value="seller_acme">Apex Electronics</option>
                    <option value="seller_nexus">Nexus Direct Store</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="custom-customer-email" className="text-slate-700 font-semibold block mb-1">
                  Buyer Account Email
                </label>
                <input
                  id="custom-customer-email"
                  type="email"
                  value={customScenario.customer_email}
                  onChange={(e) =>
                    setCustomScenario({
                      ...customScenario,
                      customer_email: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba]"
                />
              </div>

              <div>
                <label htmlFor="custom-reason" className="text-slate-700 font-semibold block mb-1">
                  Dispute Reason Code
                </label>
                <select
                  id="custom-reason"
                  value={customScenario.reason}
                  onChange={(e) =>
                    setCustomScenario({
                      ...customScenario,
                      reason: e.target.value,
                    })
                  }
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba]"
                >
                  <option value="ITEM_NOT_RECEIVED">ITEM_NOT_RECEIVED</option>
                  <option value="SIGNIFICANTLY_NOT_AS_DESCRIBED">
                    SIGNIFICANTLY_NOT_AS_DESCRIBED
                  </option>
                  <option value="UNAUTHORIZED">UNAUTHORIZED_PURCHASE</option>
                  <option value="MERCHANDISE_OR_SERVICE_NOT_RECEIVED">
                    MERCHANDISE_OR_SERVICE_NOT_RECEIVED
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="custom-auto-triage"
                  checked={customScenario.auto_triage}
                  onChange={(e) =>
                    setCustomScenario({
                      ...customScenario,
                      auto_triage: e.target.checked,
                    })
                  }
                  className="rounded border-slate-300 text-[#0070ba] focus:ring-[#0070ba] w-4 h-4"
                />
                <label htmlFor="custom-auto-triage" className="text-slate-700 font-medium">
                  Trigger automated AI Triage &amp; EV arbitration immediately
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors border border-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={injecting !== null}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#0070ba] hover:bg-[#005ea6] active:bg-[#004b85] text-white font-bold rounded-lg shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Simulate Dispute</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
