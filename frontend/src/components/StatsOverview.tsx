"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Zap,
  TrendingUp,
  RefreshCw,
  HelpCircle,
  X,
  CheckCircle,
} from "lucide-react";
import { StatsResponse } from "@/lib/api";

interface StatsOverviewProps {
  stats: StatsResponse | null;
  loading: boolean;
  onRefresh?: () => void;
  sellerFilter?: string | null;
  sellerName?: string | null;
  isOffline?: boolean;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  loading,
  onRefresh,
  sellerFilter,
  sellerName,
  isOffline = false,
}) => {
  const [showFormulaModal, setShowFormulaModal] = useState(false);
  const modalCloseBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!showFormulaModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowFormulaModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    modalCloseBtnRef.current?.focus();
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showFormulaModal]);

  if (loading && !stats) {
    return (
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-slate-200 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-slate-200 rounded w-28 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between h-36 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 bg-slate-100 rounded w-24"></div>
                <div className="h-9 w-9 bg-slate-100 rounded-lg"></div>
              </div>
              <div className="space-y-2 mt-4">
                <div className="h-7 bg-slate-100 rounded w-36"></div>
                <div className="h-3 bg-slate-100 rounded w-28"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const safeStats: StatsResponse = stats || {
    total_disputes: 0,
    open_disputes: 0,
    total_amount_at_risk: 0,
    total_amount_protected: 0,
    win_rate: 0,
    auto_executed_count: 0,
    avg_resolution_time_hours: 0,
    currency: "USD",
  };

  const autonomyRatio =
    safeStats.total_disputes > 0
      ? Math.round(
          (safeStats.auto_executed_count / safeStats.total_disputes) * 100
        )
      : 0;

  const winRatePercent = Math.round(safeStats.win_rate * 100);

  const formatCurrency = (amount: number, curr = "USD") => {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: curr || "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `$${amount.toFixed(2)}`;
    }
  };

  const winRateTag =
    winRatePercent >= 80
      ? "Strong Defense"
      : winRatePercent >= 50
      ? "Moderate Defense"
      : "Under Baseline";

  const cards = [
    {
      title: "Protected Capital",
      value: formatCurrency(safeStats.total_amount_protected, safeStats.currency),
      subtitle: `${safeStats.auto_executed_count} claims successfully defended`,
      icon: ShieldCheck,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 border-emerald-200",
      tag: "EV Arbitrated",
      tagColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
      tooltip:
        "Net merchant revenue preserved through AI arbitration and automated PayPal evidence submission.",
    },
    {
      title: "Active Exposure",
      value: formatCurrency(safeStats.total_amount_at_risk, safeStats.currency),
      subtitle: `${safeStats.open_disputes} claims under active review`,
      icon: AlertTriangle,
      color: "text-amber-600",
      bgColor: "bg-amber-50 border-amber-200",
      tag: "Under Triage",
      tagColor: "bg-amber-50 text-amber-700 border-amber-200",
      tooltip:
        "Total gross funds held in escrow across pending PayPal chargebacks and buyer claims.",
    },
    {
      title: "Arbitration Win Rate",
      value: `${winRatePercent}%`,
      subtitle: "Verified against PayPal Sandbox",
      icon: TrendingUp,
      color: "text-[#0070ba]",
      bgColor: "bg-blue-50 border-blue-200",
      tag: winRateTag,
      tagColor: "bg-blue-50 text-[#0070ba] border-blue-200",
      tooltip:
        "Percentage of contested disputes awarded in favor of the seller by PayPal claims adjudication.",
      progress: winRatePercent,
      progressColor: "bg-[#0070ba]",
    },
    {
      title: "Autonomous Resolution",
      value: `${safeStats.auto_executed_count} / ${safeStats.total_disputes}`,
      subtitle: `${safeStats.avg_resolution_time_hours}h avg turnaround time`,
      icon: Zap,
      color: "text-sky-700",
      bgColor: "bg-sky-50 border-sky-200",
      tag: `${autonomyRatio}% Autonomous`,
      tagColor: "bg-sky-50 text-sky-800 border-sky-200",
      tooltip:
        "Disputes autonomously arbitrated without manual intervention (amount < $100 & win probability >= 70%).",
      progress: autonomyRatio,
      progressColor: "bg-[#0070ba]",
    },
  ];

  return (
    <div className="w-full space-y-3">
      {/* Top Header Row with Status & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            Executive Risk &amp; Capital Protection Overview
            {sellerName && (
              <span className="text-[11px] font-normal normal-case text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                Scope: <strong className="text-slate-900">{sellerName}</strong>
              </span>
            )}
          </span>
          <button
            onClick={() => setShowFormulaModal(true)}
            className="text-slate-400 hover:text-[#0070ba] p-1 rounded-md hover:bg-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0070ba]"
            title="Inspect Mathematical Expected Value (EV) Model"
            aria-label="Inspect EV Model"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Real-time Webhook Pulse Indicator */}
          {isOffline ? (
            <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full shadow-sm">
              <span className="inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              <span className="font-semibold">Offline (mock data)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-full shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="font-medium text-slate-500 hidden md:inline">
                PayPal Webhooks:
              </span>
              <span className="font-semibold text-emerald-700">Synchronized</span>
            </div>
          )}

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba] disabled:opacity-50"
              title="Refresh KPI statistics"
            >
              <RefreshCw
                className={`w-3 h-3 ${loading ? "animate-spin text-[#0070ba]" : ""}`}
              />
              <span className="hidden sm:inline">Sync</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {cards.map((c, idx) => {
          const IconComponent = c.icon;
          return (
            <div
              key={idx}
              className="bg-white border border-slate-200/90 hover:border-slate-300 transition-all duration-200 rounded-xl p-5 shadow-sm hover:shadow-md flex flex-col justify-between relative overflow-hidden group"
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  {c.title}
                </span>
                <div
                  className={`p-2 rounded-lg border ${c.bgColor} ${c.color} transition-transform group-hover:scale-105 duration-150`}
                >
                  <IconComponent className="w-4 h-4" />
                </div>
              </div>

              {/* Card Value & Details */}
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-mono flex items-baseline gap-2">
                  <span>{c.value}</span>
                </div>

                {/* Progress bar if present */}
                {c.progress !== undefined && (
                  <div className="mt-2.5 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${c.progressColor} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(0, c.progress))}%` }}
                    />
                  </div>
                )}

                {/* Subtitle & Tag */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span className="truncate pr-1 text-[11px] font-medium" title={c.subtitle}>
                    {c.subtitle}
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[10px] whitespace-nowrap border shrink-0 ${c.tagColor}`}
                    title={c.tooltip}
                  >
                    {c.tag}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* EV Mathematical Model Explainer Modal */}
      {showFormulaModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ev-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFormulaModal(false);
          }}
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="relative w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 text-slate-700 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h3 id="ev-modal-title" className="text-base font-bold text-slate-900">
                  Mathematical Expected Value (EV) Model
                </h3>
              </div>
              <button
                ref={modalCloseBtnRef}
                onClick={() => setShowFormulaModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba] focus-visible:ring-offset-2"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <p>
                Sentin AI computes the mathematically optimal resolution strategy (Contest vs. Settle vs. Refund) using Expected Value risk arbitration:
              </p>

              <div className="p-3 bg-slate-950 text-sky-300 rounded-xl font-mono text-[11px] space-y-1.5 shadow-inner">
                <div className="text-slate-400 font-semibold">// Expected Value of Contesting</div>
                <div>EV(Contest) = P(Win) × Amount - (1 - P(Win)) × (Amount + Fee) - Labor</div>
                <div className="text-slate-400 font-semibold pt-1">// Expected Value of Settle / Concession</div>
                <div>EV(Settle) = -Amount</div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Auto-Execution Guardrails:</strong> Configurable fallback default thresholds apply in heuristic mode: claims with amount &le; $100.00 (inclusive), win probability &ge; 70%, and buyer risk score &le; 0.50 are auto-executed via PayPal Disputes v1. When live Gemini AI arbitration is enabled, decisions are determined directly by the model&apos;s structured reasoning.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">Fee Penalty Avoidance:</strong> If EV(Settle) &gt; EV(Contest) on low-value claims, Sentin AI automatically concessions the claim to eliminate PayPal&apos;s $15 dispute penalty fee.
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 bg-[#0070ba] hover:bg-[#005ea6] text-white font-semibold text-xs rounded-lg transition-colors shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0070ba] focus-visible:ring-offset-2"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
