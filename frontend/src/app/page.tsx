"use client";

import React, { useState, useEffect, useCallback } from "react";
import { StatsOverview } from "@/components/StatsOverview";
import { DemoControlBar } from "@/components/DemoControlBar";
import { DisputeStudio } from "@/components/DisputeStudio";
import { DisputeDetailDrawer } from "@/components/DisputeDetailDrawer";
import { api, DisputeSummary, DisputeDetail, StatsResponse } from "@/lib/api";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function Home() {
  const [disputes, setDisputes] = useState<DisputeSummary[]>([]);
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Inspection Drawer State
  const [selectedDispute, setSelectedDispute] = useState<DisputeDetail | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [disputesRes, statsRes] = await Promise.all([
        api.getDisputes(),
        api.getStats(),
      ]);
      setDisputes(disputesRes.disputes);
      setStats(statsRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard data";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSelectDispute = async (dispute: DisputeSummary) => {
    try {
      const detail = await api.getDispute(dispute.id);
      setSelectedDispute(detail);
      setIsDrawerOpen(true);
    } catch (err: unknown) {
      console.error("Failed to load dispute detail:", err);
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
    } catch (err: unknown) {
      console.error("Failed to triage dispute:", err);
    }
  };

  return (
    <div className="space-y-6">
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
      <StatsOverview stats={stats} loading={loading} onRefresh={fetchData} />

      {/* 2. 1-Click Hackathon Pitch Scenario Injector */}
      <DemoControlBar onScenarioInjected={fetchData} />

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
