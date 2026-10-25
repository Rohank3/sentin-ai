"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Eye,
  Sparkles,
  ArrowUpDown,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";
import { DisputeSummary } from "@/lib/api";

interface DisputeStudioProps {
  disputes: DisputeSummary[];
  loading: boolean;
  onSelectDispute: (dispute: DisputeSummary) => void;
  onTriageDispute: (disputeId: string) => Promise<void>;
  onRefresh: () => void;
}

export const DisputeStudio: React.FC<DisputeStudioProps> = ({
  disputes,
  loading,
  onSelectDispute,
  onTriageDispute,
  onRefresh,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [triagingId, setTriagingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<"amount" | "created_at">("created_at");
  const [sortAsc, setSortAsc] = useState(false);

  const filteredDisputes = useMemo(() => {
    return disputes
      .filter((d) => {
        const matchesStatus =
          statusFilter === "ALL" || d.status === statusFilter;
        const searchLower = searchTerm.toLowerCase();
        const matchesSearch =
          !searchTerm ||
          d.paypal_dispute_id.toLowerCase().includes(searchLower) ||
          d.customer_email.toLowerCase().includes(searchLower) ||
          d.reason.toLowerCase().includes(searchLower) ||
          d.seller_name.toLowerCase().includes(searchLower);

        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => {
        if (sortField === "amount") {
          return sortAsc ? a.amount - b.amount : b.amount - a.amount;
        }
        return sortAsc
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [disputes, statusFilter, searchTerm, sortField, sortAsc]);

  const handleTriage = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTriagingId(id);
    try {
      await onTriageDispute(id);
    } finally {
      setTriagingId(null);
    }
  };

  const statusOptions = [
    { id: "ALL", label: "All Disputes" },
    { id: "OPEN", label: "Open" },
    { id: "UNDER_REVIEW", label: "Under Review" },
    { id: "RESOLVED", label: "Resolved" },
  ];

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col">
      {/* Studio Header Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Merchant Risk Operations Matrix
            </h2>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
              {filteredDisputes.length} active claims
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            AG Grid & Studio command table with autonomous claim execution, policy RAG, and expected value ranking.
          </p>
        </div>

        {/* Filter and search controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search disputes, emails, carriers..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            />
          </div>

          {/* Sort Toggle */}
          <button
            onClick={() => {
              if (sortField === "amount") {
                setSortAsc(!sortAsc);
              } else {
                setSortField("amount");
                setSortAsc(false);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Sort by amount"
          >
            <ArrowUpDown className="w-3.5 h-3.5" />
            <span>{sortField === "amount" ? (sortAsc ? "Amount ↑" : "Amount ↓") : "Sort Amount"}</span>
          </button>

          {/* Refresh */}
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Refresh disputes"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
        <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        {statusOptions.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setStatusFilter(opt.id)}
            className={`text-xs font-semibold px-3 py-1 rounded-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              statusFilter === opt.id
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Grid Content / Table View */}
      <div className="overflow-x-auto">
        {loading && disputes.length === 0 ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="animate-pulse bg-slate-800/40 rounded-lg p-4 flex items-center justify-between"
              >
                <div className="space-y-2">
                  <div className="h-4 bg-slate-700 rounded w-48"></div>
                  <div className="h-3 bg-slate-700/60 rounded w-32"></div>
                </div>
                <div className="h-8 bg-slate-700 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : filteredDisputes.length === 0 ? (
          <div className="py-16 px-4 text-center">
            <div className="inline-flex p-3 rounded-full bg-slate-800 text-slate-400 mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-white">No disputes found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              There are currently no claims matching this filter. Use the 1-click Scenario Injector above to simulate a live PayPal dispute.
            </p>
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Dispute & Claim</th>
                <th className="py-3 px-4">Merchant</th>
                <th className="py-3 px-4">Buyer Account</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">AI Recommendation</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredDisputes.map((d) => {
                const isTriaging = triagingId === d.id;
                const recAction = d.ai_decision?.recommended_action;
                const winProb = d.ai_decision
                  ? Math.round(d.ai_decision.win_probability * 100)
                  : null;

                return (
                  <tr
                    key={d.id}
                    onClick={() => onSelectDispute(d)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                  >
                    {/* Dispute ID & Reason */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-blue-400 group-hover:text-blue-300">
                        {d.paypal_dispute_id}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[200px]" title={d.reason}>
                        {d.reason}
                      </div>
                    </td>

                    {/* Merchant */}
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {d.seller_name}
                    </td>

                    {/* Buyer */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-300 font-mono text-[11px] truncate max-w-[180px]" title={d.customer_email}>
                        {d.customer_email}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {new Date(d.created_at).toLocaleDateString()}
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-white text-sm">
                        ${d.amount.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-400 font-semibold">{d.currency}</div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                          d.status === "RESOLVED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                            : d.status === "UNDER_REVIEW"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        }`}
                      >
                        {d.status === "RESOLVED" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : d.status === "UNDER_REVIEW" ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        <span>{d.status}</span>
                      </span>
                    </td>

                    {/* AI Recommendation */}
                    <td className="py-3.5 px-4">
                      {d.ai_decision ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                                recAction === "CONTEST"
                                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                  : "bg-blue-500/20 text-blue-300 border-blue-500/30"
                              }`}
                            >
                              {recAction}
                            </span>
                            {winProb !== null && (
                              <span className="text-[11px] font-bold text-slate-300">
                                {winProb}% Win
                              </span>
                            )}
                          </div>
                          {d.auto_executed && (
                            <div className="text-[10px] text-purple-400 font-semibold flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Autonomous ({d.action_taken || "Executed"})</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] italic">
                          Awaiting Triage
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={(e) => handleTriage(e, d.id)}
                          disabled={isTriaging}
                          className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
                          title="Trigger AI Triage (Gemini 2.0 Flash)"
                        >
                          <Sparkles className={`w-3.5 h-3.5 ${isTriaging ? "animate-spin text-purple-400" : ""}`} />
                        </button>
                        <button
                          onClick={() => onSelectDispute(d)}
                          className="flex items-center gap-1 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-semibold text-xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Inspect</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
