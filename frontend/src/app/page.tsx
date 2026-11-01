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
  AlertCircle,
  RefreshCw,
  Store,
  Radio,
  CheckCircle2,
  X,
  SlidersHorizontal,
} from "lucide-react";

export default function Home() {
  const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [sellers, setSellers] = useState<SellerSummary[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Live polling state (useful for live demo webhook streams)
  const [autoPolling, setAutoPolling] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date>(new Date());
  const [toastMessage, setToastMessage] = useState<{
    type: "success" | "info" | "error";
    text: string;
  } | null>(null);

  // Inspection Drawer State
  const [selectedDispute, setSelectedDispute] = useState<DisputeDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Initial load of sellers list
  useEffect(() => {
    async function loadSellers() {
      try {
        const res = await api.getSellers();
        setSellers(res.sellers);
      } catch (err: unknown) {
        console.warn("Could not load sellers:", err);
      }
    }
    loadSellers();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const sellerIdParam = selectedSeller === "ALL" ? undefined : selectedSeller;
      const [disputesRes, statsRes] = await Promise.all([
        api.getDisputes({ seller_id: sellerIdParam }),
        api.getStats(sellerIdParam),
      ]);
      setDisputes(disputesRes.disputes);
      setStats(statsRes);
      setLastSyncTime(new Date());
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load dashboard data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [selectedSeller]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live Polling interval (every 8 seconds if enabled)
  useEffect(() => {
    if (!autoPolling) return;
    const interval = setInterval(() => {
      fetchData();
    }, 8000);
    return () => clearInterval(interval);
  }, [autoPolling, fetchData]);

  const handleSelectDispute = async (dispute: DisputeSummary) => {
    try {
      const detail = await api.getDispute(dispute.id);
      setSelectedDispute(detail);
      setIsDrawerOpen(true);
    } catch (err: unknown) {
      console.error("Failed to load dispute detail:", err);
      setToastMessage({
        type: "error",
        text: "Could not load dispute detail from backend.",
      });
    }
  };

  const handleTriageDispute = async (disputeId: string) => {
    try {
      await api.triggerTriage(disputeId);
      await fetchData();
      if (selectedDispute && selectedDispute.id === disputeId) {
        const updated = await api.getDispute(disputeId);
        setSelectedDispute(updated);
      }
      setToastMessage({
        type: "success",
        text: `AI Triage completed for dispute #${disputeId}`,
      });
    } catch (err: unknown) {
      console.error("Failed to triage dispute:", err);
      const msg = err instanceof Error ? err.message : "Triage request failed";
      setToastMessage({
        type: "error",
        text: `Triage failed: ${msg}`,
      });
    }
  };

  // Find active seller name for display
  const currentSellerName =
    selectedSeller === "ALL"
      ? null
      : sellers.find((s) => s.id === selectedSeller)?.name || selectedSeller;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center justify-between gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-md text-xs font-semibold animate-slideUp ${
            toastMessage.type === "success"
              ? "bg-emerald-950/90 text-emerald-200 border-emerald-500/40"
              : toastMessage.type === "error"
              ? "bg-red-950/90 text-red-200 border-red-500/40"
              : "bg-blue-950/90 text-blue-200 border-blue-500/40"
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{toastMessage.text}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="p-1 hover:text-white rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Global Filter Bar: Marketplace Merchant Selector & Live Polling */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 sm:px-4 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
            <Store className="w-4 h-4 text-blue-400" />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-300">
              Active Merchant View:
            </span>
            <select
              value={selectedSeller}
              onChange={(e) => setSelectedSeller(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-white font-semibold text-xs rounded-lg px-2.5 py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="ALL">All Marketplace Merchants (Aggregate)</option>
              {sellers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.dispute_count} claims • ${(s.total_amount_at_risk || 0).toFixed(0)} exposure)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Polling Toggle */}
        <div className="flex items-center gap-3 self-end sm:self-auto text-xs">
          <button
            onClick={() => setAutoPolling(!autoPolling)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all ${
              autoPolling
                ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-sm"
                : "bg-slate-800/80 hover:bg-slate-800 text-slate-400 border-slate-700/80"
            }`}
            title="Toggle automatic 8s webhook polling"
          >
            <Radio className={`w-3.5 h-3.5 ${autoPolling ? "animate-pulse text-emerald-400" : ""}`} />
            <span className="font-semibold">
              {autoPolling ? "Live Polling On (8s)" : "Auto-Poll Off"}
            </span>
          </button>
          <span className="text-[11px] text-slate-500 hidden md:inline">
            Synced {lastSyncTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between text-red-300 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-1 font-bold underline hover:text-white"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* 1. Executive Performance Metrics */}
      <StatsOverview
        stats={stats}
        loading={loading}
        onRefresh={fetchData}
        sellerFilter={selectedSeller}
        sellerName={currentSellerName}
      />

      {/* 2. 1-Click Hackathon Pitch Scenario Injector */}
      <DemoControlBar
        onScenarioInjected={fetchData}
        onSelectDisputeId={(id) => handleSelectDispute({ id } as DisputeSummary)}
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
