"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart3,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  AlertTriangle,
  Sparkles,
  Info,
  RefreshCw,
} from "lucide-react";
import { AgStudio } from "ag-studio-react";
import { studioTheme } from "ag-studio";
import { colorSchemeDarkBlue } from "ag-grid-community";
import { DisputeSummary } from "@/lib/api";

const sentinStudioTheme = studioTheme.withPart(colorSchemeDarkBlue);

interface DisputeAnalyticsStudioProps {
  disputes: DisputeSummary[];
  loading: boolean;
}

export const DisputeAnalyticsStudio: React.FC<DisputeAnalyticsStudioProps> = ({
  disputes,
  loading,
}) => {
  const [studioMode, setStudioMode] = useState<"view" | "edit">("view");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prepare tabular dataset for AG Studio Data Engine
  const studioData = useMemo(() => {
    const records = disputes.map((d) => {
      const winProb = d.ai_decision?.win_probability;
      const validWinProb =
        typeof winProb === "number" &&
        Number.isFinite(winProb) &&
        winProb >= 0 &&
        winProb <= 1
          ? Math.round(winProb * 100)
          : null;

      const ev = d.ai_decision?.expected_value;
      const validEv =
        typeof ev === "number" && Number.isFinite(ev)
          ? Math.round(ev * 100) / 100
          : null;

      const validCurrency =
        typeof d.currency === "string" && d.currency.trim()
          ? d.currency.trim().toUpperCase()
          : "UNKNOWN";

      return {
        id: d.id,
        dispute_id: d.paypal_dispute_id,
        merchant: d.seller_name || "Unknown Merchant",
        buyer: d.customer_email || "Anonymous",
        amount: typeof d.amount === "number" && Number.isFinite(d.amount) ? d.amount : 0,
        currency: validCurrency,
        reason: (d.reason || "OTHER").replace(/_/g, " "),
        status: (d.status || "OPEN").replace(/_/g, " "),
        ai_recommendation: d.ai_decision?.recommended_action || "Awaiting Triage",
        win_probability_pct: validWinProb,
        expected_value: validEv,
        autonomy_status: d.auto_executed ? "Autonomous Action" : "Manual Supervisor",
        created_date: d.created_at ? d.created_at.split("T")[0] : "",
      };
    });

    return {
      sources: [
        {
          id: "disputes_docket",
          name: "Merchant Disputes Docket",
          description:
            "Active dispute claims, reason codes, monetary exposure, AI triage recommendations, and expected value estimations.",
          data: records,
        },
      ],
    };
  }, [disputes]);

  // Real-time metrics computed strictly on the current docket
  const metrics = useMemo(() => {
    const count = disputes.length;

    // Group exposure totals by currency safely
    const exposureByCurrency: Record<string, number> = {};
    for (const d of disputes) {
      const curr =
        typeof d.currency === "string" && d.currency.trim()
          ? d.currency.trim().toUpperCase()
          : "UNKNOWN";
      const amt = typeof d.amount === "number" && Number.isFinite(d.amount) ? d.amount : 0;
      exposureByCurrency[curr] = (exposureByCurrency[curr] || 0) + amt;
    }

    // Filter win probability to strictly finite numbers in [0, 1]
    const validProbs: number[] = [];
    for (const d of disputes) {
      const wp = d.ai_decision?.win_probability;
      if (typeof wp === "number" && Number.isFinite(wp) && wp >= 0 && wp <= 1) {
        validProbs.push(wp);
      }
    }

    const avgWinRate =
      validProbs.length > 0
        ? Math.round(
            (validProbs.reduce((acc, val) => acc + val, 0) / validProbs.length) * 100
          )
        : null;

    const autonomousCount = disputes.filter((d) => Boolean(d.auto_executed)).length;

    return {
      count,
      exposureByCurrency,
      avgWinRate,
      autonomousCount,
    };
  }, [disputes]);

  // Exposure formatted strings list
  const exposureDisplay = useMemo(() => {
    const entries = Object.entries(metrics.exposureByCurrency);
    if (entries.length === 0) return [{ label: "$0.00", currency: "USD" }];

    return entries.map(([curr, amt]) => {
      let formatted: string;
      try {
        if (curr !== "UNKNOWN") {
          formatted = new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: curr,
          }).format(amt);
        } else {
          formatted = `${amt.toFixed(2)}`;
        }
      } catch {
        formatted = `${amt.toFixed(2)}`;
      }
      return { label: formatted, currency: curr };
    });
  }, [metrics.exposureByCurrency]);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Analytics Scope & Mode Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold text-white tracking-tight">
              AG Studio Embedded Portfolio Analytics
            </h3>
            <span className="text-[10px] bg-blue-500/10 text-blue-300 font-bold px-2 py-0.5 rounded-full border border-blue-500/20">
              AG Studio 3.0 Engine
            </span>
            {loading && disputes.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20 animate-pulse">
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>Refreshing...</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span>
              Multi-dimensional cross-filtering and report building covering the loaded docket (
              {disputes.length} claims).
            </span>
          </p>
        </div>

        {/* Studio Mode Controls */}
        <div className="flex items-center gap-2 self-start lg:self-auto">
          <span className="text-xs text-slate-400 font-medium mr-1 hidden sm:inline">
            Canvas Mode:
          </span>
          <div
            role="group"
            aria-label="Analytics Canvas Mode"
            className="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800 text-xs"
          >
            <button
              type="button"
              aria-pressed={studioMode === "view"}
              onClick={() => setStudioMode("view")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 ${
                studioMode === "view"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Interactive locked canvas dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard (View)</span>
            </button>
            <button
              type="button"
              aria-pressed={studioMode === "edit"}
              onClick={() => setStudioMode("edit")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95 ${
                studioMode === "edit"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Drag & drop report designer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Report Builder (Edit)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Docket Statistical Highlights Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Claims in Scope</div>
          <div className="text-lg font-extrabold text-white mt-0.5">{metrics.count}</div>
          <div className="text-[10px] text-slate-500">Live dispute records</div>
        </div>

        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Capital at Risk</div>
          <div className="mt-0.5 space-y-0.5">
            {exposureDisplay.map((exp, idx) => (
              <div key={idx} className="text-lg font-extrabold text-white flex items-baseline gap-1">
                <span>{exp.label}</span>
                {exp.currency === "UNKNOWN" && (
                  <span className="text-[10px] text-slate-400 font-normal">({exp.currency})</span>
                )}
              </div>
            ))}
          </div>
          <div className="text-[10px] text-slate-500">Grouped by currency</div>
        </div>

        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Avg Arbitration Win %</div>
          <div className="text-lg font-extrabold text-emerald-400 mt-0.5">
            {metrics.avgWinRate !== null ? `${metrics.avgWinRate}%` : "—"}
          </div>
          <div className="text-[10px] text-slate-500">Gemini 2.0 Flash evaluated</div>
        </div>

        <div className="p-3 bg-slate-900/80 border border-slate-800 rounded-xl">
          <div className="text-[11px] text-slate-400 font-medium">Autonomous Triage</div>
          <div className="text-lg font-extrabold text-purple-400 mt-0.5 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>{metrics.autonomousCount}</span>
          </div>
          <div className="text-[10px] text-slate-500">Pre-approved executions</div>
        </div>
      </div>

      {/* AG Studio Component Container */}
      <div className="w-full h-[580px] bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-2xl relative">
        {/* Rule 1: Before mount or while initially loading without any data: blocking loading state */}
        {!isMounted || (loading && disputes.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3">
            <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-blue-400 animate-spin">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white">Initializing AG Studio Engine...</h4>
              <p className="text-xs text-slate-400 max-w-sm">
                Preparing multi-dimensional data sources and relational schema for analytics.
              </p>
            </div>
          </div>
        ) : disputes.length === 0 ? (
          /* Rule 4: When loading finishes with no data: show the empty state */
          <div className="h-full flex flex-col items-center justify-center p-8 text-center">
            <div className="p-3 rounded-full bg-slate-900 border border-slate-800 text-slate-400 mb-3">
              <AlertTriangle className="w-6 h-6 text-amber-400" />
            </div>
            <h4 className="text-sm font-bold text-white">No Dispute Data to Analyze</h4>
            <p className="text-xs text-slate-400 max-w-md mt-1">
              There are currently no dispute records loaded. Use the Scenario Injector in the
              dashboard to generate live PayPal dispute claims to populate AG Studio analytics.
            </p>
          </div>
        ) : (
          /* Rule 2 & 3: When data exists during refresh, keep AgStudio mounted; non-blocking refresh indicator in header */
          <AgStudio
            data={studioData}
            mode={studioMode}
            theme={sentinStudioTheme}
            style={{ width: "100%", height: "100%" }}
          />
        )}
      </div>
    </div>
  );
};
