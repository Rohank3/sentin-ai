"use client";

import React, { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
  Search,
  Filter,
  Eye,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  ShieldCheck,
  ChevronRight,
  AlertCircle,
  BarChart3,
} from "lucide-react";
import {
  AllCommunityModule,
  ModuleRegistry,
  themeQuartz,
  colorSchemeDarkBlue,
  type ColDef,
  type IRowNode,
  type RowClickedEvent,
} from "ag-grid-community";
import { AgGridReact, type CustomCellRendererProps } from "ag-grid-react";
import { DisputeSummary, AIDecision } from "@/lib/api";
import { DisputeAnalyticsStudio } from "./DisputeAnalyticsStudio";

// Register AG Grid Community modules
ModuleRegistry.registerModules([AllCommunityModule]);

// Scoped Quartz Dark Theme configured for Sentin AI Slate / PayPal Blue palette
const sentinDarkTheme = themeQuartz
  .withPart(colorSchemeDarkBlue)
  .withParams({
    backgroundColor: "#090d16",
    foregroundColor: "#f1f5f9",
    headerBackgroundColor: "#020617",
    headerTextColor: "#94a3b8",
    headerFontWeight: 600,
    headerFontSize: 11,
    rowHoverColor: "rgba(30, 41, 59, 0.6)",
    selectedRowBackgroundColor: "rgba(30, 58, 138, 0.25)",
    borderColor: "#1e293b",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: 12,
    cellHorizontalPadding: 16,
    rowHeight: 52,
    headerHeight: 40,
  });

export interface DisputeStudioProps {
  disputes: DisputeSummary[];
  loading: boolean;
  onSelectDispute: (dispute: DisputeSummary) => void;
  onTriageDispute: (disputeId: string) => Promise<void>;
  onRefresh: () => void;
}

// Currency format helper
const formatCurrency = (amount: number | null | undefined, currency?: string): string => {
  const safeAmount = typeof amount === "number" && !isNaN(amount) ? amount : 0;
  const safeCurrency = currency && typeof currency === "string" && currency.trim() ? currency.trim().toUpperCase() : "USD";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: safeCurrency,
    }).format(safeAmount);
  } catch {
    return `$${safeAmount.toFixed(2)}`;
  }
};

// Custom No-Rows Overlay Component
const NoDisputesOverlay: React.FC = () => (
  <div className="py-12 px-4 text-center">
    <div className="inline-flex p-3 rounded-full bg-slate-800 text-slate-400 mb-3 border border-slate-700">
      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
    </div>
    <h3 className="text-sm font-bold text-white">No disputes found</h3>
    <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
      There are currently no claims matching this filter. Use the 1-click Scenario Injector above to simulate a live PayPal dispute.
    </p>
  </div>
);

// Custom Loading Overlay Component
const LoadingDisputesOverlay: React.FC = () => (
  <div className="py-12 px-4 text-center">
    <div className="inline-flex p-3 rounded-full bg-slate-800 text-blue-400 mb-3 border border-slate-700 animate-spin">
      <RefreshCw className="w-6 h-6" />
    </div>
    <h3 className="text-sm font-bold text-white">Loading claims...</h3>
    <p className="text-xs text-slate-400 mt-1">Retrieving merchant risk matrix records.</p>
  </div>
);

export const DisputeStudio: React.FC<DisputeStudioProps> = ({
  disputes,
  loading,
  onSelectDispute,
  onTriageDispute,
  onRefresh,
}) => {
  const gridRef = useRef<AgGridReact<DisputeSummary>>(null);
  const [activeTab, setActiveTab] = useState<"operations" | "analytics">("operations");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [triagingId, setTriagingId] = useState<string | null>(null);
  const [displayedCount, setDisplayedCount] = useState<number>(disputes.length);

  const statusOptions = [
    { id: "ALL", label: "All Disputes" },
    { id: "OPEN", label: "Open" },
    { id: "UNDER_REVIEW", label: "Under Review" },
    { id: "RESOLVED", label: "Resolved" },
    { id: "WAITING_FOR_SELLER_RESPONSE", label: "Action Required" },
  ];

  // Trigger grid filter recalculation when status filter changes
  useEffect(() => {
    if (gridRef.current?.api) {
      gridRef.current.api.onFilterChanged();
      setDisplayedCount(gridRef.current.api.getDisplayedRowCount());
    }
  }, [statusFilter]);

  // Update displayed row count when disputes change
  useEffect(() => {
    if (gridRef.current?.api) {
      setDisplayedCount(gridRef.current.api.getDisplayedRowCount());
    } else {
      setDisplayedCount(disputes.length);
    }
  }, [disputes]);

  const handleTriage = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setTriagingId(id);
    try {
      await onTriageDispute(id);
    } finally {
      setTriagingId(null);
    }
  };

  // External Filter predicates for Status Tabs
  const isExternalFilterPresent = useCallback(() => {
    return statusFilter !== "ALL";
  }, [statusFilter]);

  const doesExternalFilterPass = useCallback(
    (node: IRowNode<DisputeSummary>) => {
      if (!node.data) return false;
      if (statusFilter === "ALL") return true;
      return node.data.status === statusFilter;
    },
    [statusFilter]
  );

  const onModelUpdated = useCallback(() => {
    if (gridRef.current?.api) {
      setDisplayedCount(gridRef.current.api.getDisplayedRowCount());
    }
  }, []);

  const onRowClicked = useCallback(
    (event: RowClickedEvent<DisputeSummary>) => {
      if (event.data) {
        onSelectDispute(event.data);
      }
    },
    [onSelectDispute]
  );

  // Column Definitions
  const columnDefs = useMemo<ColDef<DisputeSummary>[]>(() => {
    return [
      // 1. Dispute ID & Claim
      {
        field: "paypal_dispute_id",
        headerName: "Dispute & Claim",
        minWidth: 180,
        flex: 1.2,
        cellRenderer: (params: CustomCellRendererProps<DisputeSummary>) => {
          if (!params.data) return null;
          return (
            <div className="flex flex-col justify-center h-full py-1">
              <span className="font-mono font-bold text-blue-400 group-hover:text-blue-300">
                {params.data.paypal_dispute_id}
              </span>
              <span className="text-[10px] text-slate-500 font-mono truncate" title={params.data.id}>
                ID: {params.data.id}
              </span>
            </div>
          );
        },
      },

      // 2. Merchant
      {
        field: "seller_name",
        headerName: "Merchant",
        minWidth: 140,
        flex: 1,
        cellRenderer: (params: CustomCellRendererProps<DisputeSummary>) => {
          if (!params.data) return null;
          return (
            <div className="flex items-center h-full font-medium text-slate-200 truncate">
              {params.data.seller_name}
            </div>
          );
        },
      },

      // 3. Buyer Account
      {
        field: "customer_email",
        headerName: "Buyer Account",
        minWidth: 190,
        flex: 1.2,
        cellRenderer: (params: CustomCellRendererProps<DisputeSummary>) => {
          if (!params.data) return null;
          return (
            <div className="flex flex-col justify-center h-full py-1">
              <span className="text-slate-300 font-mono text-[11px] truncate" title={params.data.customer_email}>
                {params.data.customer_email}
              </span>
              <span className="text-[10px] text-slate-500">
                {new Date(params.data.created_at).toLocaleDateString()}
              </span>
            </div>
          );
        },
      },

      // 4. Disputed Amount
      {
        field: "amount",
        headerName: "Amount",
        minWidth: 120,
        flex: 0.9,
        filter: "agNumberColumnFilter",
        cellRenderer: (params: CustomCellRendererProps<DisputeSummary>) => {
          if (!params.data) return null;
          return (
            <div className="flex flex-col justify-center h-full py-1">
              <span className="font-extrabold text-white text-xs">
                {formatCurrency(params.data.amount, params.data.currency)}
              </span>
              <span className="text-[10px] text-slate-400 font-semibold">{params.data.currency}</span>
            </div>
          );
        },
      },

      // 5. Dispute Reason / Type
      {
        field: "reason",
        headerName: "Dispute Reason",
        minWidth: 170,
        flex: 1.1,
        cellRenderer: (params: CustomCellRendererProps<DisputeSummary>) => {
          if (!params.data) return null;
          const readableReason = params.data.reason
            ? params.data.reason.replace(/_/g, " ")
            : "Unknown Reason";
          return (
            <div className="flex items-center h-full">
              <span
                className="text-[11px] text-slate-300 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/80 truncate max-w-[155px]"
                title={params.data.reason}
              >
                {readableReason}
              </span>
            </div>
          );
        },
      },

      // 6. Current Status
      {
        field: "status",
        headerName: "Status",
        minWidth: 150,
        flex: 1,
        cellRenderer: (params: CustomCellRendererProps<DisputeSummary>) => {
          if (!params.data) return null;
          const status = params.data.status;
          switch (status) {
            case "RESOLVED":
              return (
                <div className="flex items-center h-full">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                    <CheckCircle2 className="w-3 h-3 shrink-0" />
                    <span>RESOLVED</span>
                  </span>
                </div>
              );
            case "UNDER_REVIEW":
              return (
                <div className="flex items-center h-full">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>UNDER REVIEW</span>
                  </span>
                </div>
              );
            case "OPEN":
              return (
                <div className="flex items-center h-full">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <AlertTriangle className="w-3 h-3 shrink-0" />
                    <span>OPEN</span>
                  </span>
                </div>
              );
            case "WAITING_FOR_SELLER_RESPONSE":
              return (
                <div className="flex items-center h-full">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>ACTION REQ.</span>
                  </span>
                </div>
              );
            case "WAITING_FOR_BUYER_RESPONSE":
              return (
                <div className="flex items-center h-full">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30">
                    <Clock className="w-3 h-3 shrink-0" />
                    <span>WAITING BUYER</span>
                  </span>
                </div>
              );
            default:
              return (
                <div className="flex items-center h-full">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    <AlertCircle className="w-3 h-3 shrink-0" />
                    <span>{status || "UNKNOWN"}</span>
                  </span>
                </div>
              );
          }
        },
      },

      // 7. AI Recommendation
      {
        field: "ai_decision",
        headerName: "AI Recommendation",
        minWidth: 165,
        flex: 1.1,
        valueGetter: (params) => params.data?.ai_decision?.recommended_action || "",
        cellRenderer: (params: CustomCellRendererProps<DisputeSummary>) => {
          const decision: AIDecision | undefined | null = params.data?.ai_decision;
          if (!decision || !decision.recommended_action) {
            return (
              <div className="flex items-center h-full text-slate-500 text-[11px] italic">
                Awaiting Triage
              </div>
            );
          }

          const action = decision.recommended_action;
          const isContest = action === "CONTEST";
          const isSettle = action === "SETTLE";

          return (
            <div className="flex items-center gap-1.5 h-full flex-wrap">
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded border ${
                  isContest
                    ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                    : isSettle
                    ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                    : "bg-slate-700/60 text-slate-300 border-slate-600"
                }`}
              >
                {action}
              </span>
              {params.data?.auto_executed && (
                <span
                  className="text-[10px] text-purple-300 bg-purple-500/20 border border-purple-500/30 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5"
                  title={`Autonomous action: ${params.data.action_taken || "Executed"}`}
                >
                  <ShieldCheck className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>Auto</span>
                </span>
              )}
            </div>
          );
        },
      },

      // 8. Win Probability
      {
        headerName: "Win %",
        minWidth: 125,
        flex: 0.9,
        valueGetter: (params) => {
          const wp = params.data?.ai_decision?.win_probability;
          return typeof wp === "number" && !isNaN(wp) ? wp : null;
        },
        cellRenderer: (params: CustomCellRendererProps<DisputeSummary>) => {
          const winProb = params.data?.ai_decision?.win_probability;
          if (typeof winProb !== "number" || isNaN(winProb) || winProb < 0 || winProb > 1) {
            return (
              <div className="flex items-center h-full text-slate-600 text-[11px]">
                —
              </div>
            );
          }

          const percent = Math.round(winProb * 100);
          const barColor =
            percent >= 70 ? "bg-emerald-400" : percent >= 40 ? "bg-amber-400" : "bg-rose-400";
          const textColor =
            percent >= 70 ? "text-emerald-300" : percent >= 40 ? "text-amber-300" : "text-rose-300";

          return (
            <div className="flex items-center gap-2 h-full w-full max-w-[110px]">
              <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div className={`h-full ${barColor}`} style={{ width: `${percent}%` }} />
              </div>
              <span className={`text-[11px] font-bold font-mono ${textColor}`}>
                {percent}%
              </span>
            </div>
          );
        },
      },

      // 9. Actions
      {
        headerName: "Actions",
        minWidth: 165,
        width: 170,
        sortable: false,
        filter: false,
        resizable: false,
        cellRenderer: (params: CustomCellRendererProps<DisputeSummary>) => {
          if (!params.data) return null;
          const dispute = params.data;
          const isTriaging = triagingId === dispute.id;

          return (
            <div className="flex items-center justify-end gap-1.5 h-full">
              <button
                onClick={(e) => handleTriage(e, dispute.id)}
                disabled={isTriaging}
                className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50"
                title="Trigger AI Triage (Gemini 2.0 Flash)"
                aria-label={`Trigger AI triage for ${dispute.paypal_dispute_id}`}
              >
                <Sparkles className={`w-3.5 h-3.5 ${isTriaging ? "animate-spin text-purple-400" : ""}`} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectDispute(dispute);
                }}
                className="flex items-center gap-1 text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 font-semibold text-xs"
                title="Inspect dispute evidence docket"
                aria-label={`Inspect ${dispute.paypal_dispute_id}`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Inspect</span>
                <ChevronRight className="w-3 h-3 text-slate-400" />
              </button>
            </div>
          );
        },
      },
    ];
  }, [triagingId, onSelectDispute]);

  const defaultColDef = useMemo<ColDef>(
    () => ({
      sortable: true,
      filter: true,
      resizable: true,
    }),
    []
  );

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-xl shadow-xl overflow-hidden flex flex-col">
      {/* Studio View Selector & Main Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90">
        <div>
          <div className="flex items-center gap-2">
            {activeTab === "operations" ? (
              <Layers className="w-5 h-5 text-blue-400" />
            ) : (
              <BarChart3 className="w-5 h-5 text-purple-400" />
            )}
            <h2 className="text-base font-bold text-white tracking-tight">
              {activeTab === "operations"
                ? "Merchant Risk Operations Matrix"
                : "Dispute Intelligence & Portfolio Studio"}
            </h2>
            <span className="text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
              {disputes.length} claims loaded
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {activeTab === "operations"
              ? "AG Grid command matrix with autonomous claim execution, policy RAG, and expected value ranking."
              : "AG Studio 3.0 embedded analytics engine with cross-filtering, multi-dimensional aggregations, and visual reporting."}
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs shadow-inner">
            <button
              onClick={() => setActiveTab("operations")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === "operations"
                  ? "bg-blue-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="Dispute operations data grid"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Operations (AG Grid)</span>
            </button>
            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                activeTab === "analytics"
                  ? "bg-purple-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
              }`}
              title="AG Studio embedded analytics canvas"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Analytics (AG Studio)</span>
            </button>
          </div>

          {/* Refresh Action */}
          <button
            onClick={onRefresh}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            title="Refresh disputes"
            aria-label="Refresh dispute matrix"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
          </button>
        </div>
      </div>

      {activeTab === "operations" ? (
        <>
          {/* Operations Toolbar with Quick Search */}
          <div className="p-3 sm:px-5 bg-slate-950/40 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Status Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto">
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

            {/* Quick Search Input */}
            <div className="relative sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search claims, merchants, buyers..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700/80 rounded-lg text-white placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          {/* AG Grid React View */}
          <div className="w-full h-[540px]">
            <AgGridReact<DisputeSummary>
              ref={gridRef}
              rowData={disputes}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              theme={sentinDarkTheme}
              loading={loading && disputes.length === 0}
              quickFilterText={searchTerm}
              isExternalFilterPresent={isExternalFilterPresent}
              doesExternalFilterPass={doesExternalFilterPass}
              onModelUpdated={onModelUpdated}
              onRowClicked={onRowClicked}
              rowSelection={{ mode: "singleRow", enableClickSelection: true }}
              pagination={true}
              paginationPageSize={10}
              paginationPageSizeSelector={[10, 25, 50]}
              noRowsOverlayComponent={NoDisputesOverlay}
              loadingOverlayComponent={LoadingDisputesOverlay}
              animateRows={true}
            />
          </div>
        </>
      ) : (
        <div className="p-4 sm:p-5">
          <DisputeAnalyticsStudio disputes={disputes} loading={loading} />
        </div>
      )}
    </div>
  );
};
