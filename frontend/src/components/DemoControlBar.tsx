"use client";

import React, { useState } from "react";
import {
  Sparkles,
  PackageCheck,
  PackageX,
  AlertOctagon,
  Zap,
  ShieldAlert,
  CheckCircle2,
  DollarSign,
  PlusCircle,
  Sliders,
  X,
  Play,
  HelpCircle,
  Shield,
  ArrowRight,
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
  const [showPitchGuide, setShowPitchGuide] = useState(false);

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
    customer_email: "live.demo.buyer@example.com",
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
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
      category: "auto",
      highlight: "Elastic RAG + UPS PoD",
    },
    {
      id: "INR_NO_TRACKING",
      label: "INR Weather Exception",
      sublabel: "Sorting depot weather delay; low win odds",
      amount: 34.0,
      reason: "ITEM_NOT_RECEIVED",
      icon: PackageX,
      badge: "EV Concession",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
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
      badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/30",
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
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
      category: "gate",
      highlight: ">$100 Human Sign-off",
    },
    {
      id: "FRAUD_PATTERN",
      label: "Repeat Claim Abuse",
      sublabel: "Buyer risk score 0.88 with 3 prior disputes",
      amount: 250.0,
      reason: "ITEM_NOT_RECEIVED",
      icon: ShieldAlert,
      badge: "Fraud Ring Flag",
      badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
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
      badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30",
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Injection failed";
      setLastResponse({
        dispute_id: "",
        paypal_dispute_id: "ERROR",
        scenario_type: scenarioType,
        status: "FAILED",
        message: msg,
      });
    } finally {
      setInjecting(null);
    }
  };

  const handleCustomInject = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Custom simulation failed";
      setLastResponse({
        dispute_id: "",
        paypal_dispute_id: "ERROR",
        scenario_type: customScenario.scenario_type,
        status: "FAILED",
        message: msg,
      });
    } finally {
      setInjecting(null);
    }
  };

  return (
    <div className="w-full bg-slate-900/95 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-4">
      {/* Top Header & Pitch Helper */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-blue-600/10 text-blue-400 rounded-xl border border-blue-500/20 shrink-0">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white tracking-wide">
                Dispute Scenario Injector (Live Pitch Control)
              </h3>
              <span className="text-[10px] bg-blue-500/10 text-blue-400 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
                1-Click Demo Engine
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly simulates incoming PayPal dispute webhooks, executes Elastic hybrid RAG, computes EV, and triggers arbitration.
            </p>
          </div>
        </div>

        {/* Action Controls: Tabs & Custom Trigger & Pitch Guide */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Pitch Guide Toggle */}
          <button
            onClick={() => setShowPitchGuide(!showPitchGuide)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              showPitchGuide
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80"
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>3-Min Demo Script</span>
          </button>

          {/* Custom Simulator Button */}
          <button
            onClick={() => setShowCustomModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 active:bg-blue-700 rounded-lg shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Custom Scenario</span>
          </button>

          {/* Category Tabs */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab("ALL")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === "ALL"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All (6)
            </button>
            <button
              onClick={() => setActiveTab("AUTO")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === "AUTO"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Autonomous
            </button>
            <button
              onClick={() => setActiveTab("RISK")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                activeTab === "RISK"
                  ? "bg-slate-800 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Gated & Risk
            </button>
          </div>
        </div>
      </div>

      {/* 3-Minute Demo Pitch Guide Bar (Collapsible) */}
      {showPitchGuide && (
        <div className="bg-slate-950/90 border border-amber-500/30 rounded-xl p-4 space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
            <span className="flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 fill-current" />
              Recommended 3-Minute Hackathon Demo Narrative
            </span>
            <button
              onClick={() => setShowPitchGuide(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs text-slate-300 pt-1">
            <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
              <div className="font-bold text-emerald-400">Step 1: Auto-Defense</div>
              <p className="text-[11px] text-slate-400">
                Click <strong>INR + Verified Tracking</strong>. Show how PoD is retrieved via Elastic and submitted directly to PayPal Disputes v1.
              </p>
            </div>
            <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
              <div className="font-bold text-blue-400">Step 2: EV Concession</div>
              <p className="text-[11px] text-slate-400">
                Click <strong>Micro-SNAD Concession</strong>. Show how EV math proves refunding $19.50 immediately avoids a mandatory $15 fee.
              </p>
            </div>
            <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
              <div className="font-bold text-red-400">Step 3: Fraud Ring Flag</div>
              <p className="text-[11px] text-slate-400">
                Click <strong>Repeat Claim Abuse</strong>. Highlight historical buyer profiling (3 prior disputes) blocking automated refund.
              </p>
            </div>
            <div className="p-2.5 bg-slate-900/80 rounded-lg border border-slate-800 space-y-1">
              <div className="font-bold text-amber-400">Step 4: Human-in-the-Loop</div>
              <p className="text-[11px] text-slate-400">
                Click <strong>High Value Escrow</strong>. Show the supervisor approval gate for claims exceeding the $100 merchant policy ceiling.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Live Injected Response Toast / Notification */}
      {lastResponse && (
        <div
          className={`flex items-center justify-between gap-3 text-xs p-3 rounded-lg border transition-all ${
            lastResponse.status === "FAILED"
              ? "bg-red-500/10 text-red-300 border-red-500/30"
              : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white mr-1.5">
                {lastResponse.paypal_dispute_id}
              </span>
              <span>{lastResponse.message}</span>
            </div>
          </div>
          <button
            onClick={() => setLastResponse(null)}
            className="text-slate-400 hover:text-white p-1"
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
              className="group relative flex flex-col justify-between p-3.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 active:bg-slate-700/80 border border-slate-700/80 hover:border-blue-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 text-left min-h-[140px]"
            >
              <div>
                <div className="w-full flex items-center justify-between mb-2">
                  <div className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors">
                    <IconComp className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${s.badgeColor}`}
                  >
                    {s.badge}
                  </span>
                </div>

                <div className="font-bold text-xs text-white group-hover:text-blue-300 transition-colors">
                  {s.label}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {s.sublabel}
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-700/60 w-full flex items-center justify-between text-[11px]">
                <span className="font-extrabold text-white">${s.amount.toFixed(2)}</span>
                <span className="text-[10px] text-slate-400 font-medium bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800">
                  {s.highlight}
                </span>
              </div>

              {isCurrentInjecting && (
                <div className="absolute inset-0 bg-slate-900/90 rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-blue-300 backdrop-blur-sm z-10">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Arbitrating...</span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Custom Simulator Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">
                  Custom Dispute Simulator (Judge Test)
                </h3>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCustomInject} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Scenario Archetype
                </label>
                <select
                  value={customScenario.scenario_type}
                  onChange={(e) =>
                    setCustomScenario({
                      ...customScenario,
                      scenario_type: e.target.value as SimulateRequest["scenario_type"],
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
                  <label className="text-slate-300 font-semibold block mb-1">
                    Dispute Amount ($ USD)
                  </label>
                  <input
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
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Merchant Store
                  </label>
                  <select
                    value={customScenario.seller_id}
                    onChange={(e) =>
                      setCustomScenario({
                        ...customScenario,
                        seller_id: e.target.value,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <option value="seller_acme">Apex Electronics</option>
                    <option value="seller_nexus">Nexus Direct Store</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Buyer Account Email
                </label>
                <input
                  type="email"
                  value={customScenario.customer_email}
                  onChange={(e) =>
                    setCustomScenario({
                      ...customScenario,
                      customer_email: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">
                  Dispute Reason Code
                </label>
                <select
                  value={customScenario.reason}
                  onChange={(e) =>
                    setCustomScenario({
                      ...customScenario,
                      reason: e.target.value,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
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
                  id="auto_triage"
                  checked={customScenario.auto_triage}
                  onChange={(e) =>
                    setCustomScenario({
                      ...customScenario,
                      auto_triage: e.target.checked,
                    })
                  }
                  className="rounded border-slate-700 text-blue-600 focus:ring-blue-500 w-4 h-4 bg-slate-950"
                />
                <label htmlFor="auto_triage" className="text-slate-300 font-medium">
                  Immediately trigger Gemini 2.0 Flash AI Triage & EV arbitration
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={injecting !== null}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg transition-colors disabled:opacity-50"
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
