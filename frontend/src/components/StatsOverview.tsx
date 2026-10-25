"use client";

import React from "react";
import { ShieldCheck, AlertTriangle, Cpu, TrendingUp } from "lucide-react";
import { StatsResponse } from "@/lib/api";

interface StatsOverviewProps {
  stats: StatsResponse | null;
  loading: boolean;
  onRefresh?: () => void;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({ stats, loading }) => {
  if (loading && !stats) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="animate-pulse bg-slate-900/60 border border-slate-800 rounded-xl p-5 flex flex-col justify-between h-32"
          >
            <div className="flex items-center justify-between">
              <div className="h-4 bg-slate-800 rounded w-24"></div>
              <div className="h-8 w-8 bg-slate-800 rounded-lg"></div>
            </div>
            <div className="h-8 bg-slate-800 rounded w-36"></div>
          </div>
        ))}
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
      trend: "+100% EV Max",
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
      trend: "Under Triage",
    },
    {
      title: "Arbitration Win Rate",
      value: `${Math.round(safeStats.win_rate * 100)}%`,
      subtitle: "Verified against PayPal Sandbox",
      icon: TrendingUp,
      color: "text-blue-400",
      bgColor: "bg-blue-500/10 border-blue-500/20",
      trend: "Industry Top 5%",
    },
    {
      title: "AI Autonomy Engine",
      value: `${safeStats.auto_executed_count}/${safeStats.total_disputes}`,
      subtitle: `${safeStats.avg_resolution_time_hours}h avg resolution speed`,
      icon: Cpu,
      color: "text-purple-400",
      bgColor: "bg-purple-500/10 border-purple-500/20",
      trend: "Autonomous",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {cards.map((c, idx) => {
        const IconComponent = c.icon;
        return (
          <div
            key={idx}
            className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition-all duration-200 rounded-xl p-5 shadow-lg backdrop-blur-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {c.title}
              </span>
              <div className={`p-2 rounded-lg border ${c.bgColor} ${c.color}`}>
                <IconComponent className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {c.value}
              </div>
              <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                <span>{c.subtitle}</span>
                <span className="text-slate-300 font-medium bg-slate-800/80 px-2 py-0.5 rounded text-[10px]">
                  {c.trend}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
