"use client";

import React, { useState } from "react";
import {
  X,
  ShieldCheck,
  RotateCcw,
  Scale,
  FileText,
  Truck,
  UserCheck,
  Send,
  AlertCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { DisputeDetail, api } from "@/lib/api";

interface DisputeDetailDrawerProps {
  dispute: DisputeDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onActionComplete: () => void;
}

export const DisputeDetailDrawer: React.FC<DisputeDetailDrawerProps> = ({
  dispute,
  isOpen,
  onClose,
  onActionComplete,
}) => {
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  if (!isOpen || !dispute) return null;

  const handleExecute = async (action: "CONTEST" | "SETTLE" | "REFUND") => {
    setActionError(null);
    setSubmittingAction(action);
    try {
      await api.executeAction(dispute.id, action, notes || undefined);
      onActionComplete();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Execution failed";
      setActionError(msg);
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleRetriage = async () => {
    setActionError(null);
    setSubmittingAction("TRIAGE");
    try {
      await api.triggerTriage(dispute.id);
      onActionComplete();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Triage failed";
      setActionError(msg);
    } finally {
      setSubmittingAction(null);
    }
  };

  const winProbPercent = dispute.ai_decision
    ? Math.round(dispute.ai_decision.win_probability * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                {dispute.paypal_dispute_id}
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  dispute.status === "RESOLVED"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {dispute.status}
              </span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              Dispute Triage & Evidence Docket
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 active:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Close detail panel"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {actionError && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {/* Key Dispute Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700/60">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Claim Amount</div>
              <div className="text-lg font-extrabold text-white">
                ${dispute.amount.toFixed(2)} {dispute.currency}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Reason Code</div>
              <div className="text-xs font-semibold text-slate-200 mt-1 truncate" title={dispute.reason}>
                {dispute.reason}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Merchant / Store</div>
              <div className="text-xs font-semibold text-slate-200 mt-1">
                {dispute.seller_name}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Buyer Account</div>
              <div className="text-xs font-mono text-slate-300 mt-1 truncate" title={dispute.customer_email}>
                {dispute.customer_email}
              </div>
            </div>
          </div>

          {/* AI Claims Evaluator Section */}
          <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">AI Claims Evaluator (Gemini 2.0 Flash)</h3>
              </div>
              <button
                onClick={handleRetriage}
                disabled={submittingAction !== null}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded border border-blue-500/30 transition-colors disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${submittingAction === "TRIAGE" ? "animate-spin" : ""}`} />
                <span>Re-Evaluate</span>
              </button>
            </div>

            {dispute.ai_decision ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                  <div>
                    <div className="text-xs text-slate-400">Recommended Resolution</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-sm font-black px-2.5 py-0.5 rounded border ${
                          dispute.ai_decision.recommended_action === "CONTEST"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : "bg-blue-500/20 text-blue-300 border-blue-500/40"
                        }`}
                      >
                        {dispute.ai_decision.recommended_action}
                      </span>
                      {dispute.ai_decision.auto_execute && (
                        <span className="text-[11px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded">
                          Autonomous Pre-Approved
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <div className="text-xs text-slate-400">Arbitration Win Probability</div>
                    <div className="text-base font-black text-white mt-0.5">
                      {winProbPercent}%
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div>
                  <div className="w-full bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        winProbPercent >= 70
                          ? "bg-emerald-400"
                          : winProbPercent >= 40
                          ? "bg-amber-400"
                          : "bg-red-400"
                      }`}
                      style={{ width: `${winProbPercent}%` }}
                    ></div>
                  </div>
                </div>

                {/* Reasoning text */}
                <div className="text-xs text-slate-300 leading-relaxed bg-slate-900/40 p-3 rounded border border-slate-800">
                  <div className="font-semibold text-slate-400 mb-1">Reasoning & Justification:</div>
                  {dispute.ai_decision.reasoning}
                </div>

                {/* Confidence Factors */}
                {dispute.ai_decision.confidence_factors.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-400">Confidence Evidence Points:</div>
                    <ul className="space-y-1">
                      {dispute.ai_decision.confidence_factors.map((factor, idx) => (
                        <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{factor}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-xs">
                Awaiting AI Triage. Click Re-Evaluate above to trigger Gemini 2.0 Flash.
              </div>
            )}
          </div>

          {/* Mathematical Expected Value (EV) Matrix */}
          {dispute.ev_breakdown && (
            <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Mathematical Expected Value (EV) Matrix</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">EV (Contest Claim)</div>
                  <div className={`text-base font-extrabold mt-1 ${dispute.ev_breakdown.expected_value_contest >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ${dispute.ev_breakdown.expected_value_contest.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Weighted risk & fees</div>
                </div>

                <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">EV (Settle / Refund)</div>
                  <div className="text-base font-extrabold text-slate-300 mt-1">
                    ${dispute.ev_breakdown.expected_value_settle.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Fixed concession cost</div>
                </div>

                <div className="bg-slate-900/70 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                  <div className="text-[11px] text-emerald-300 font-semibold">Net Capital Preserved</div>
                  <div className="text-base font-black text-emerald-400 mt-1">
                    +${dispute.ev_breakdown.savings.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-emerald-500/80 mt-0.5">Optimal strategy upside</div>
                </div>
              </div>
            </div>
          )}

          {/* Elastic Hybrid RAG Evidence */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Retrieved Context (Elasticsearch Hybrid RAG)
            </h3>

            {/* Policies */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Store & Platform Terms Clause</span>
              </div>
              {dispute.evidence.policies_found.length > 0 ? (
                dispute.evidence.policies_found.map((p, idx) => (
                  <p key={idx} className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
                    {p}
                  </p>
                ))
              ) : (
                <div className="text-xs text-slate-500">No custom policy clause attached.</div>
              )}
            </div>

            {/* Proof of Delivery (PoD) */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <Truck className="w-4 h-4 text-amber-400" />
                <span>Courier Proof of Delivery (PoD)</span>
              </div>
              {dispute.evidence.pod_records.length > 0 ? (
                dispute.evidence.pod_records.map((pod, idx) => (
                  <div key={idx} className="text-xs bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-1">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-200">
                        {pod.carrier} Tracking: {pod.tracking_number}
                      </span>
                      <span className="font-bold text-emerald-400">{pod.status}</span>
                    </div>
                    {pod.delivery_notes && (
                      <p className="text-slate-400">{pod.delivery_notes}</p>
                    )}
                    {pod.signature_confirmed && (
                      <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1 mt-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Recipient Signature Verified</span>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="text-xs text-slate-500">No courier tracking record retrieved.</div>
              )}
            </div>

            {/* Buyer Profile */}
            <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                <UserCheck className="w-4 h-4 text-purple-400" />
                <span>Buyer Lifetime Value & Risk Profile</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs text-slate-300">
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Total Spend</span>
                  <span className="font-bold text-white">
                    ${(dispute.evidence.customer_history.total_spend || 0).toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Orders / Disputes</span>
                  <span className="font-bold text-white">
                    {dispute.evidence.customer_history.total_orders || 0} / {dispute.evidence.customer_history.prior_disputes || 0}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Risk Score</span>
                  <span className={`font-bold ${(dispute.evidence.customer_history.risk_score || 0) > 0.5 ? "text-red-400" : "text-emerald-400"}`}>
                    {((dispute.evidence.customer_history.risk_score || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Audit Trail Chronology */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Audit Chronology
            </h3>
            <div className="space-y-2">
              {dispute.audit_log.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2.5 text-xs">
                  <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold text-slate-300">{item.action}</span>
                    <p className="text-slate-400 text-[11px]">{item.details}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Manual Execution Form (Human In Loop) */}
          {dispute.status !== "RESOLVED" && (
            <div className="bg-slate-800/90 rounded-xl p-5 border border-slate-700 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Supervisor Override & Execution
              </h3>
              <div>
                <label className="text-[11px] text-slate-400 font-medium block mb-1">
                  Arbitration Notes (Dispatched to PayPal API)
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional evidence rationale or dispute response note..."
                  className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  onClick={() => handleExecute("CONTEST")}
                  disabled={submittingAction !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-lg disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Execute Contest via PayPal</span>
                </button>
                <button
                  onClick={() => handleExecute("REFUND")}
                  disabled={submittingAction !== null}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Issue Full Refund</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
