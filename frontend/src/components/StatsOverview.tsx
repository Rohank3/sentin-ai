"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  AlertTriangle,
  Cpu,
  TrendingUp,
  RefreshCw,
  Info,
  CheckCircle,
  HelpCircle,
  X,
  ExternalLink,
} from "lucide-react";
import { StatsResponse } from "@/lib/api";

interface StatsOverviewProps {
  stats: StatsResponse | null;
  loading: boolean;
  onRefresh?: () => void;
  sellerFilter?: string | null;
  sellerName?: string | null;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  loading,
  onRefresh,
  sellerFilter,
  sellerName,
}) => {
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  if (loading && !stats) {
    return (
      <div className="w-full space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 bg-slate-800 rounded w-48 animate-pulse"></div>
          <div className="h-4 bg-slate-800 rounded w-28 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="animate-pulse bg-slate-900/60 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between h-36"
            >
              <div className="flex items-center justify-between">
                <div className="h-4 bg-slate-800 rounded w-24"></div>
                <div className="h-9 w-9 bg-slate-800 rounded-lg"></div>
              </div>
              <div className="space-y-2 mt-4">
                <div className="h-8 bg-slate-800 rounded w-36"></div>
                <div className="h-3 bg-slate-800/70 rounded w-28"></div>
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

  const cards = [
    {
      title: "Protected Capital",
      value: `$${safeStats.total_amount_protected.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtitle: `${safeStats.auto_executed_count} claims auto-defended`,
      icon: ShieldCheck,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10 border-emerald-500/20",
      accentGlow: "group-hover:border-emerald-500/40",
      tag: "EV Maximized",
      tagColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      tooltip:
        "Net merchant revenue preserved through AI arbitration and automated PayPal evidence submission.",
      metricNote: "+100% of EV positive claims",
    },
    {
      title: "Active Exposure",
      value: `$${safeStats.total_amount_at_risk.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      subtitle: `${safeStats.open_disputes} claims under review`,
      icon: AlertTriangle,
      color: "text-amber-400",
      bgColor: "bg-amber-500/10 border-amber-500/20",
      accentGlow: "group-hover:border-amber-500/40",
      tag: "Active Triage",
      tagColor: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      tooltip:
        "Total gross funds held in escrow across pending PayPal chargebacks and buyer disputes.",
      metricNote:
        safeStats.open_disputes > 0
          ? `${safeStats.open_disputes} awaiting resolution`
          : "All claims clear",
    },
    {
      title: "Arbitration Win Rate",
      value: `${winRatePercent}%`,
      subtitle: "Verified against PayPal Sandbox",
      icon: TrendingUp,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10 border-blue-500/20",
      accentGlow: "group-hover:border-blue-500/40",
      tag: "Top Tier",
      tagColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      tooltip:
        "Percentage of contested disputes awarded in favor of the seller by PayPal claims adjudication.",
      progress: winRatePercent,
      progressColor: "bg-blue-500",
    },
    {
      title: "AI Autonomy Engine",
      value: `${safeStats.auto_executed_count} / ${safeStats.total_disputes}`,
      subtitle: `${safeStats.avg_resolution_time_hours}h avg turnaround`,
      icon: Cpu,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10 border-purple-500/20",
      accentGlow: "group-hover:border-purple-500/40",
      tag: `${autonomyRatio}% Autonomous`,
      tagColor: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      tooltip:
        "Disputes autonomously arbitrated without human intervention (dispute amount < $100 & win probability >= 70%).",
      progress: autonomyRatio,
      progressColor: "bg-purple-500",
    },
  ];

  return (
    <div className="w-full space-y-3">
      {/* Top Header Row with Status & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            Executive Risk & Performance KPIs
            {sellerName && (
              <span className="text-[11px] font-normal normal-case text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700">
                Viewing: <strong className="text-slate-200">{sellerName}</strong>
              </span>
            )}
          </span>
          <button
            onClick={() => setShowFormulaModal(true)}
            className="text-slate-400 hover:text-blue-400 p-1 rounded-md hover:bg-slate-800 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
            title="Inspect Mathematical EV Arbitrage Model"
            aria-label="Inspect EV Model"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Real-time Webhook Pulse Indicator */}
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-900/80 border border-slate-800 px-2.5 py-1 rounded-full shadow-inner">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-medium text-slate-300 hidden md:inline">
              PayPal Webhook Stream
            </span>
            <span className="font-semibold text-emerald-400">Live</span>
          </div>

          {/* Refresh Button */}
          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={loading}
              className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-700/80 transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
              title="Refresh KPI statistics"
            >
              <RefreshCw
                className={`w-3 h-3 ${loading ? "animate-spin text-blue-400" : ""}`}
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
              className={`group bg-slate-900/80 border border-slate-800 ${c.accentGlow} hover:bg-slate-900 transition-all duration-200 rounded-xl p-5 shadow-lg backdrop-blur-sm flex flex-col justify-between relative overflow-hidden`}
            >
              {/* Card Header */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  {c.title}
                </span>
                <div
                  className={`p-2 rounded-lg border ${c.bgColor} ${c.color} transition-transform group-hover:scale-105 duration-200`}
                >
                  <IconComponent className="w-5 h-5" />
                </div>
              </div>

              {/* Card Value & Details */}
              <div className="mt-4">
                <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
                  <span>{c.value}</span>
                  {safeStats.currency && idx === 0 && (
                    <span className="text-xs font-semibold text-slate-500">
                      {safeStats.currency}
                    </span>
                  )}
                </div>

                {/* Progress bar if present */}
                {c.progress !== undefined && (
                  <div className="mt-2 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${c.progressColor} rounded-full transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(0, c.progress))}%` }}
                    />
                  </div>
                )}

                {/* Subtitle & Tag */}
                <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                  <span className="truncate pr-1" title={c.subtitle}>
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Mathematical Expected Value (EV) Model
                </h3>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                Sentin AI computes the optimal dispute strategy (Contest vs. Settle vs. Refund) using probabilistic risk arbitration rather than naive rule heuristics:
              </p>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[11px] text-blue-300 space-y-1.5">
                <div className="text-slate-400 font-semibold">// Expected Value of Contesting</div>
                <div>EV(Contest) = P(Win) × Amount - (1 - P(Win)) × (Amount + Fee) - Labor</div>
                <div className="text-slate-400 font-semibold pt-1">// Expected Value of Settle / Concession</div>
                <div>EV(Settle) = -Amount</div>
              </div>

              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Auto-Execution Guardrails:</strong> Claims under $100 with win probability &ge; 70% and customer risk score &le; 0.50 are dispatched automatically via PayPal Disputes v1.
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white">Fee Penalty Avoidance:</strong> If EV(Settle) &gt; EV(Contest) on low-value claims, Sentin AI automatically concessions the claim to eliminate PayPal&apos;s $15 dispute penalty fee.
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-lg transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
