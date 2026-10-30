"use client";

import React, { useState, useEffect } from "react";
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
  Check,
  Copy,
  CheckCircle2,
  Handshake,
  AlertTriangle,
} from "lucide-react";
import { DisputeDetail, api } from "@/lib/api";

interface DisputeDetailDrawerProps {
  dispute: DisputeDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onActionComplete: () => void;
}

type DisputeActionType = "CONTEST" | "SETTLE" | "REFUND";

interface PendingActionState {
  disputeId: string;
  action: DisputeActionType;
}

interface ActionConsequence {
  title: string;
  badge: string;
  badgeColor: string;
  summary: string;
  capitalImpact: string;
  networkEffect: string;
  buttonClass: string;
  icon: React.ReactNode;
  isSupported: boolean;
  unsupportedReason?: string;
}

const ACTION_CONFIGS: Record<DisputeActionType, ActionConsequence> = {
  CONTEST: {
    title: "Contest Dispute Claim",
    badge: "Contest via Evidence",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    summary:
      "Dispatches merchant evidence docket and courier PoD records to PayPal Dispute Resolution Center.",
    capitalImpact: "Preserves full claim amount if arbitration is won ($0 merchant loss).",
    networkEffect: "Appeals claim to network. Incurs network dispute fee if arbitration is lost.",
    buttonClass: "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700",
    icon: <Send className="w-3.5 h-3.5" />,
    isSupported: true,
  },
  SETTLE: {
    title: "Negotiated Settlement (Unavailable)",
    badge: "Settlement Not Supported",
    badgeColor: "bg-slate-700/60 text-slate-400 border-slate-600",
    summary:
      "Partial concession / negotiated settlement offers are not yet supported by the dispute backend.",
    capitalImpact:
      "The PayPal backend currently routes settlement claims to full claim acceptance (equivalent to full refund).",
    networkEffect:
      "Disabled to prevent unintentional full concessions without negotiated settlement terms.",
    buttonClass: "bg-slate-700 text-slate-400 cursor-not-allowed",
    icon: <Handshake className="w-3.5 h-3.5" />,
    isSupported: false,
    unsupportedReason:
      "Backend API routes SETTLE to accept-claim (full refund) without a settlement amount contract. Disabled until backend negotiated settlement is implemented.",
  },
  REFUND: {
    title: "Issue Full Buyer Refund",
    badge: "Full Concession Refund",
    badgeColor: "bg-slate-700/60 text-slate-300 border-slate-600",
    summary: "Immediately accepts dispute claim and releases full transaction amount to buyer.",
    capitalImpact: "Full loss of disputed transaction funds; zero merchant recovery.",
    networkEffect: "Closes dispute immediately. Eliminates risk of adverse arbitration penalty.",
    buttonClass: "bg-slate-700 hover:bg-slate-600 active:bg-slate-800",
    icon: <RotateCcw className="w-3.5 h-3.5" />,
    isSupported: true,
  },
};

interface ExecutionFeedback {
  type: "error" | "uncertain" | "success";
  title: string;
  message: string;
}

// Reusable Accessible Copy Button
const CopyButton: React.FC<{ value?: string | null; label: string }> = ({ value, label }) => {
  const [copied, setCopied] = useState(false);

  if (!value || typeof value !== "string" || !value.trim()) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.warn("Failed to copy to clipboard:", err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className="inline-flex items-center gap-1 p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
      title={copied ? "Copied to clipboard!" : `Copy ${label}`}
      aria-label={copied ? `${label} copied` : `Copy ${label} to clipboard`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] text-emerald-400 font-semibold">Copied</span>
        </>
      ) : (
        <Copy className="w-3.5 h-3.5" />
      )}
    </button>
  );
};

export const DisputeDetailDrawer: React.FC<DisputeDetailDrawerProps> = ({
  dispute,
  isOpen,
  onClose,
  onActionComplete,
}) => {
  const [currentDispute, setCurrentDispute] = useState<DisputeDetail | null>(dispute);
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingActionState | null>(null);
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState<ExecutionFeedback | null>(null);

  // Sync internal dispute when prop updates, and reset dispute-bound staging state when dispute changes or drawer closes
  useEffect(() => {
    setCurrentDispute(dispute);
    setPendingConfirmation(null);
    setNotes("");
    setFeedback(null);
  }, [dispute?.id, isOpen]);

  if (!isOpen || !currentDispute) return null;

  const handleSelectActionForConfirmation = (action: DisputeActionType) => {
    const config = ACTION_CONFIGS[action];
    if (!config.isSupported) return;

    setFeedback(null);
    setPendingConfirmation({
      disputeId: currentDispute.id,
      action,
    });
  };

  const handleCancelConfirmation = () => {
    setPendingConfirmation(null);
  };

  const handleExecuteConfirmedAction = async () => {
    if (!pendingConfirmation) return;

    // Safety guard: Ensure the staged dispute ID matches the currently inspected dispute
    if (pendingConfirmation.disputeId !== currentDispute.id) {
      setFeedback({
        type: "error",
        title: "Dispute Mismatch",
        message: "The staged action does not match the active dispute. Action cancelled.",
      });
      setPendingConfirmation(null);
      return;
    }

    const actionToExecute = pendingConfirmation.action;
    const targetDisputeId = currentDispute.id;

    setFeedback(null);
    setSubmittingAction(actionToExecute);

    try {
      const response = await api.executeAction(
        targetDisputeId,
        actionToExecute,
        notes || undefined
      );

      setPendingConfirmation(null);
      setNotes("");

      // Step 1: Fetch authoritative dispute detail from server after confirmed execution
      let refreshedSuccessfully = false;
      try {
        const updatedDispute = await api.getDispute(targetDisputeId);
        setCurrentDispute(updatedDispute);
        refreshedSuccessfully = true;

        setFeedback({
          type: "success",
          title: "Execution Confirmed",
          message: `Action ${actionToExecute} dispatched successfully (Status: ${response.status || "CONFIRMED"}). Authoritative dispute state refreshed: ${updatedDispute.status}.`,
        });
      } catch (fetchErr) {
        console.warn("Failed to re-fetch dispute detail post-execution:", fetchErr);
        // Do NOT fabricate replacement state if refresh fails
        setFeedback({
          type: "success",
          title: "Execution Confirmed (Refresh Pending)",
          message: `Action ${actionToExecute} dispatched successfully (Status: ${response.status || "CONFIRMED"}), but authoritative dispute detail could not be refreshed from the server. Please refresh dashboard manually.`,
        });
      }

      // Notify parent to refresh list and statistics
      onActionComplete();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown error";

      // Determine if error is a confirmed pre-execution rejection vs ambiguous outcome
      // HTTP 400, 404, 422: Input validation / bad request / record missing -> confirmed rejection prior to execution
      const isConfirmedRejection =
        msg.includes("status 400") ||
        msg.includes("status 404") ||
        msg.includes("status 422");

      if (isConfirmedRejection) {
        setFeedback({
          type: "error",
          title: "Execution Rejected by Server",
          message: `${msg}. The action was rejected before execution and not applied.`,
        });
      } else {
        // Network drop, timeout, HTTP 5xx, or gateway issue: Ambiguous outcome where execution may have occurred externally
        setFeedback({
          type: "uncertain",
          title: "Execution Outcome Unconfirmed",
          message: `Communication with server resulted in an unconfirmed state (${msg}). The request may or may not have been processed by PayPal. Please verify the dispute status or refresh before attempting another action. Do not retry blindly.`,
        });
      }
    } finally {
      setSubmittingAction(null);
    }
  };

  const handleRetriage = async () => {
    setFeedback(null);
    setSubmittingAction("TRIAGE");
    const targetDisputeId = currentDispute.id;

    try {
      await api.triggerTriage(targetDisputeId);

      // Re-fetch authoritative dispute detail after triage
      try {
        const updated = await api.getDispute(targetDisputeId);
        setCurrentDispute(updated);

        setFeedback({
          type: "success",
          title: "Triage Completed",
          message: `AI Triage evaluation successfully re-calculated via Gemini 2.0 Flash. Status: ${updated.status}.`,
        });
      } catch (fetchErr) {
        console.warn("Failed to re-fetch dispute detail post-triage:", fetchErr);
        setFeedback({
          type: "success",
          title: "Triage Triggered",
          message: "AI Triage evaluation triggered successfully. Please refresh to load updated evidence.",
        });
      }

      onActionComplete();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Triage failed";
      setFeedback({
        type: "error",
        title: "Triage Evaluation Failed",
        message: `${msg}. Evidence evaluation unchanged.`,
      });
    } finally {
      setSubmittingAction(null);
    }
  };

  const winProbPercent = currentDispute.ai_decision
    ? Math.round(currentDispute.ai_decision.win_probability * 100)
    : 0;

  // Authoritative terminal statuses from server (RESOLVED, CLOSED)
  const isCurrentDisputeTerminal =
    currentDispute.status === "RESOLVED" || currentDispute.status === "CLOSED";

  // Active pending confirmation for current dispute
  const activePendingAction =
    pendingConfirmation && pendingConfirmation.disputeId === currentDispute.id
      ? pendingConfirmation.action
      : null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex justify-end">
      <div className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900/95 backdrop-blur z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1.5">
                <span>{currentDispute.paypal_dispute_id}</span>
                <CopyButton value={currentDispute.paypal_dispute_id} label="Dispute ID" />
              </span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                  isCurrentDisputeTerminal
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                }`}
              >
                {currentDispute.status}
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
          {/* Transaction Feedback Banners */}
          {feedback && feedback.type === "error" && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-2 text-red-300 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">{feedback.title}</span>
                <span>{feedback.message}</span>
              </div>
              <button
                onClick={() => setFeedback(null)}
                className="text-red-400 hover:text-white p-0.5"
                aria-label="Dismiss error"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {feedback && feedback.type === "uncertain" && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 text-amber-300 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">{feedback.title}</span>
                <span>{feedback.message}</span>
              </div>
              <button
                onClick={() => setFeedback(null)}
                className="text-amber-400 hover:text-white p-0.5"
                aria-label="Dismiss warning"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {feedback && feedback.type === "success" && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-start gap-2 text-emerald-300 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">{feedback.title}</span>
                <span>{feedback.message}</span>
              </div>
              <button
                onClick={() => setFeedback(null)}
                className="text-emerald-400 hover:text-white p-0.5"
                aria-label="Dismiss success notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Key Dispute Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-800/50 p-4 rounded-xl border border-slate-700/60">
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Claim Amount</div>
              <div className="text-lg font-extrabold text-white">
                ${currentDispute.amount.toFixed(2)} {currentDispute.currency}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Reason Code</div>
              <div className="text-xs font-semibold text-slate-200 mt-1 truncate" title={currentDispute.reason}>
                {currentDispute.reason}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Merchant / Store</div>
              <div className="text-xs font-semibold text-slate-200 mt-1 truncate" title={currentDispute.seller_name}>
                {currentDispute.seller_name}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-400 font-medium">Buyer Account</div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-xs font-mono text-slate-300 truncate max-w-[120px]" title={currentDispute.customer_email}>
                  {currentDispute.customer_email}
                </span>
                <CopyButton value={currentDispute.customer_email} label="Buyer Email" />
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
                disabled={submittingAction !== null || isCurrentDisputeTerminal}
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-1 rounded border border-blue-500/30 transition-colors disabled:opacity-50"
                title={isCurrentDisputeTerminal ? "Dispute is in a terminal state" : "Re-run AI evaluation on latest evidence"}
              >
                <RotateCcw className={`w-3.5 h-3.5 ${submittingAction === "TRIAGE" ? "animate-spin" : ""}`} />
                <span>{submittingAction === "TRIAGE" ? "Evaluating..." : "Re-Evaluate"}</span>
              </button>
            </div>

            {currentDispute.ai_decision ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-lg border border-slate-800">
                  <div>
                    <div className="text-xs text-slate-400">Recommended Resolution</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`text-sm font-black px-2.5 py-0.5 rounded border ${
                          currentDispute.ai_decision.recommended_action === "CONTEST"
                            ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                            : currentDispute.ai_decision.recommended_action === "SETTLE"
                            ? "bg-blue-500/20 text-blue-300 border-blue-500/40"
                            : "bg-slate-700/60 text-slate-300 border-slate-600"
                        }`}
                      >
                        {currentDispute.ai_decision.recommended_action}
                      </span>
                      {currentDispute.ai_decision.auto_execute && (
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
                  {currentDispute.ai_decision.reasoning}
                </div>

                {/* Confidence Factors */}
                {currentDispute.ai_decision.confidence_factors.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-slate-400">Confidence Evidence Points:</div>
                    <ul className="space-y-1">
                      {currentDispute.ai_decision.confidence_factors.map((factor, idx) => (
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
          {currentDispute.ev_breakdown && (
            <div className="bg-slate-800/80 rounded-xl p-5 border border-slate-700">
              <div className="flex items-center gap-2 mb-3">
                <Scale className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Mathematical Expected Value (EV) Matrix</h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">EV (Contest Claim)</div>
                  <div className={`text-base font-extrabold mt-1 ${currentDispute.ev_breakdown.expected_value_contest >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    ${currentDispute.ev_breakdown.expected_value_contest.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Weighted risk & fees</div>
                </div>

                <div className="bg-slate-900/70 p-3 rounded-lg border border-slate-800">
                  <div className="text-[11px] text-slate-400">EV (Settle / Refund)</div>
                  <div className="text-base font-extrabold text-slate-300 mt-1">
                    ${currentDispute.ev_breakdown.expected_value_settle.toFixed(2)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Fixed concession cost</div>
                </div>

                <div className="bg-slate-900/70 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                  <div className="text-[11px] text-emerald-300 font-semibold">Net Capital Preserved</div>
                  <div className="text-base font-black text-emerald-400 mt-1">
                    +${currentDispute.ev_breakdown.savings.toFixed(2)}
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
              {currentDispute.evidence.policies_found.length > 0 ? (
                currentDispute.evidence.policies_found.map((p, idx) => (
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
              {currentDispute.evidence.pod_records.length > 0 ? (
                currentDispute.evidence.pod_records.map((pod, idx) => (
                  <div key={idx} className="text-xs bg-slate-900/60 p-3 rounded border border-slate-800/80 space-y-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-1.5 font-semibold text-slate-200">
                        <span>{pod.carrier} Tracking: {pod.tracking_number}</span>
                        <CopyButton value={pod.tracking_number} label="Courier Tracking Number" />
                      </div>
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
                    ${(currentDispute.evidence.customer_history.total_spend || 0).toFixed(2)}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Orders / Disputes</span>
                  <span className="font-bold text-white">
                    {currentDispute.evidence.customer_history.total_orders || 0} / {currentDispute.evidence.customer_history.prior_disputes || 0}
                  </span>
                </div>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Risk Score</span>
                  <span className={`font-bold ${(currentDispute.evidence.customer_history.risk_score || 0) > 0.5 ? "text-red-400" : "text-emerald-400"}`}>
                    {((currentDispute.evidence.customer_history.risk_score || 0) * 100).toFixed(0)}%
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
              {currentDispute.audit_log.map((item, idx) => (
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
          {!isCurrentDisputeTerminal ? (
            <div className="bg-slate-800/90 rounded-xl p-5 border border-slate-700 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Supervisor Override & Execution
                </h3>
                <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                  Select Action to Review Consequence
                </span>
              </div>

              {/* Action Selector Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(["CONTEST", "SETTLE", "REFUND"] as DisputeActionType[]).map((action) => {
                  const cfg = ACTION_CONFIGS[action];
                  const isSelected = activePendingAction === action;
                  const isDisabled = submittingAction !== null || !cfg.isSupported;

                  return (
                    <button
                      key={action}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleSelectActionForConfirmation(action)}
                      className={`p-3 rounded-lg border text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        !cfg.isSupported
                          ? "bg-slate-950/40 border-slate-800/60 opacity-60 cursor-not-allowed text-slate-500"
                          : isSelected
                          ? "bg-slate-900 border-blue-500 shadow-md ring-1 ring-blue-500"
                          : "bg-slate-900/60 border-slate-700/80 hover:bg-slate-900 hover:border-slate-600 text-slate-300"
                      }`}
                      title={!cfg.isSupported ? cfg.unsupportedReason : `Select ${action}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold flex items-center gap-1.5 text-white">
                          {cfg.icon}
                          <span className={!cfg.isSupported ? "text-slate-400 line-through" : ""}>
                            {action}
                          </span>
                        </span>
                        {isSelected && <span className="w-2 h-2 rounded-full bg-blue-400"></span>}
                        {!cfg.isSupported && (
                          <span className="text-[9px] font-semibold text-amber-400/90 bg-amber-500/10 px-1 py-0.5 rounded border border-amber-500/20">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-2">
                        {cfg.summary}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Consequence Disclosure & Confirmation Safeguard */}
              {activePendingAction ? (
                <div className="p-4 bg-slate-950/80 border border-blue-500/40 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-300 flex items-center gap-1.5">
                      {ACTION_CONFIGS[activePendingAction].icon}
                      <span>Review Action: {ACTION_CONFIGS[activePendingAction].title}</span>
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        ACTION_CONFIGS[activePendingAction].badgeColor
                      }`}
                    >
                      {activePendingAction}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300 bg-slate-900/70 p-3 rounded border border-slate-800">
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 font-semibold min-w-[100px]">Summary:</span>
                      <span className="text-slate-200">
                        {ACTION_CONFIGS[activePendingAction].summary}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 font-semibold min-w-[100px]">Capital Impact:</span>
                      <span className="text-emerald-300">
                        {ACTION_CONFIGS[activePendingAction].capitalImpact}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-slate-400 font-semibold min-w-[100px]">Network Effect:</span>
                      <span className="text-slate-300">
                        {ACTION_CONFIGS[activePendingAction].networkEffect}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">
                      Arbitration Note (Dispatched to PayPal API with {activePendingAction})
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Optional evidence rationale or dispute resolution note..."
                      className="w-full text-xs bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleExecuteConfirmedAction}
                      disabled={submittingAction !== null}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 text-white font-bold text-xs rounded-lg transition-colors shadow-lg disabled:opacity-50 ${
                        ACTION_CONFIGS[activePendingAction].buttonClass
                      }`}
                    >
                      {submittingAction === activePendingAction ? (
                        <>
                          <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching to PayPal...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Confirm & Execute {activePendingAction}</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelConfirmation}
                      disabled={submittingAction !== null}
                      className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-lg transition-colors border border-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-[11px] text-slate-500 text-center py-2 bg-slate-900/30 rounded border border-slate-800/60">
                  Select an action above to review economic consequence and confirm PayPal dispatch.
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-300">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
              <div className="text-xs">
                <span className="font-bold block">Claim in Terminal State ({currentDispute.status})</span>
                <span className="text-slate-300">
                  This dispute is {currentDispute.status.toLowerCase()}. No further supervisor actions are permitted.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
