"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  BarChart3,
  Layers,
  LayoutDashboard,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Info,
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
        typeof winProb === "number" && !isNaN(winProb) && winProb >= 0 && winProb <= 1
          ? Math.round(winProb * 100)
          : null;

      const ev = d.ai_decision?.expected_value;
      const validEv = typeof ev === "number" && !isNaN(ev) ? Math.round(ev * 100) / 100 : null;

      return {
        id: d.id,
        dispute_id: d.paypal_dispute_id,
        merchant: d.seller_name || "Unknown Merchant",
        buyer: d.customer_email || "Anonymous",
        amount: typeof d.amount === "number" ? d.amount : 0,
        currency: d.currency || "USD",
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
    const totalAmount = disputes.reduce((sum, d) => sum + (d.amount || 0), 0);

    const evaluated = disputes.filter(
      (d) =>
        d.ai_decision?.win_probability !== undefined &&
        d.ai_decision?.win_probability !== null
    );
    const avgWinRate =
      evaluated.length > 0
        ? Math.round(
            (evaluated.reduce(
              (acc, d) => acc + (d.ai_decision?.win_probability || 0),
              0
            ) /
              evaluated.length) *
              100
          )
        : null;

    const autonomousCount = disputes.filter((d) => d.auto_executed).length;

    return {
      count,
      totalAmount,
      avgWinRate,
      autonomousCount,
    };
  }, [disputes]);

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
          <div className="inline-flex rounded-lg bg-slate-900 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setStudioMode("view")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
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
              onClick={() => setStudioMode("edit")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md font-semibold transition-all ${
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
          <div className="text-[11px] text-slate-400 font-medium">Total Capital at Risk</div>
          <div className="text-lg font-extrabold text-white mt-0.5">
            ${metrics.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[10px] text-slate-500">Subject to chargeback</div>
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
        {disputes.length === 0 ? (
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
        ) : !isMounted ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-400">
            Initializing AG Studio Analytics Engine...
          </div>
        ) : (
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
