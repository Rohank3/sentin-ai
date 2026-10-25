"use client";

import React, { useState } from "react";
import { Sparkles, PackageCheck, AlertOctagon, Zap, ShieldAlert, CheckCircle2 } from "lucide-react";
import { api, SimulateRequest } from "@/lib/api";

interface DemoControlBarProps {
  onScenarioInjected: () => void;
}

export const DemoControlBar: React.FC<DemoControlBarProps> = ({
  onScenarioInjected,
}) => {
  const [injecting, setInjecting] = useState<string | null>(null);
  const [lastNotification, setLastNotification] = useState<string | null>(null);

  const scenarios: Array<{
    id: SimulateRequest["scenario_type"];
    label: string;
    sublabel: string;
    amount: number;
    icon: React.ElementType;
    badge: string;
    badgeColor: string;
  }> = [
    {
      id: "INR_WITH_TRACKING",
      label: "INR + Verified Tracking",
      sublabel: "Auto-Contest via PoD ($149.99)",
      amount: 149.99,
      icon: PackageCheck,
      badge: "Auto-Defend",
      badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    },
    {
      id: "FRAUD_PATTERN",
      label: "Repeat Claim Abuse",
      sublabel: "High Buyer Risk Score ($250.00)",
      amount: 250.0,
      icon: ShieldAlert,
      badge: "Fraud Ring",
      badgeColor: "bg-red-500/20 text-red-300 border-red-500/30",
    },
    {
      id: "SNAD_MINOR",
      label: "Micro-SNAD Concession",
      sublabel: "EV Max Auto-Refund ($19.50)",
      amount: 19.5,
      icon: Zap,
      badge: "Fee Avoidance",
      badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    },
    {
      id: "SNAD_MAJOR",
      label: "High Value Escrow",
      sublabel: "Manual Supervisor Gate ($899.00)",
      amount: 899.0,
      icon: AlertOctagon,
      badge: "Human-In-Loop",
      badgeColor: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    },
  ];

  const handleInject = async (
    scenarioType: SimulateRequest["scenario_type"],
    label: string,
    amount: number
  ) => {
    setInjecting(scenarioType);
    setLastNotification(null);
    try {
      await api.simulateDispute({
        scenario_type: scenarioType,
        amount,
        auto_triage: true,
      });
      setLastNotification(`Scenario Injected: ${label}`);
      onScenarioInjected();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Injection failed";
      setLastNotification(`Error: ${msg}`);
    } finally {
      setInjecting(null);
      setTimeout(() => setLastNotification(null), 5000);
    }
  };

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-xl backdrop-blur-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-brand-500/20 text-brand-400 rounded-lg border border-brand-500/30">
            <Sparkles className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide flex items-center gap-2">
              Dispute Scenario Injector (Live Pitch Control)
              <span className="text-[10px] bg-slate-800 text-slate-300 font-semibold px-2 py-0.5 rounded-full border border-slate-700">
                1-Click Demo
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantly simulates PayPal dispute webhooks, executes Elastic hybrid RAG, and computes optimal EV.
            </p>
          </div>
        </div>

        {lastNotification && (
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lastNotification}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {scenarios.map((s) => {
          const IconComp = s.icon;
          const isCurrentInjecting = injecting === s.id;

          return (
            <button
              key={s.id}
              onClick={() => handleInject(s.id, s.label, s.amount)}
              disabled={injecting !== null}
              className="group relative flex flex-col items-start p-3.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 active:bg-slate-700/80 border border-slate-700/80 hover:border-blue-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 text-left"
            >
              <div className="w-full flex items-center justify-between mb-2">
                <div className="p-1.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors">
                  <IconComp className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded border ${s.badgeColor}`}
                >
                  {s.badge}
                </span>
              </div>

              <div className="font-semibold text-xs text-white group-hover:text-blue-300 transition-colors">
                {s.label}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {s.sublabel}
              </div>

              {isCurrentInjecting && (
                <div className="absolute inset-0 bg-slate-900/80 rounded-lg flex items-center justify-center gap-2 text-xs font-bold text-blue-300">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                  <span>Arbitrating...</span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
