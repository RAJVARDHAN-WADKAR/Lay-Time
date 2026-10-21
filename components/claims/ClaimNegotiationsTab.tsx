"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Claim, NegotiationThread, NegotiationMessage } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils/formatters";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/inputs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/context/AuthContext";
import {
  Handshake,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  ShieldCheck,
  AlertCircle,
  Send,
  Eye,
  RefreshCw,
  MessageSquare
} from "lucide-react";
import { useToast } from "@/lib/hooks/useToast";

interface ClaimNegotiationsTabProps {
  claim: Claim;
  canEdit?: boolean;
}

export function ClaimNegotiationsTab({ claim }: ClaimNegotiationsTabProps) {
  const { user, role, canSettleClaim } = useAuth();
  const { success, error, info } = useToast();

  const [thread, setThread] = useState<NegotiationThread | null>(null);
  const [messages, setMessages] = useState<NegotiationMessage[]>([]);
  const [roleType, setRoleType] = useState<string>("none");
  const [isLoading, setIsLoading] = useState(true);

  // New message input
  const [messageType, setMessageType] = useState<"text" | "counter_offer">("text");
  const [content, setContent] = useState("");
  const [counterAmount, setCounterAmount] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  // Action in-progress
  const [actionLoading, setActionLoading] = useState(false);

  const fetchNegotiations = useCallback(async () => {
    try {
      const res = await fetch(`/api/claims/${claim.id}/negotiations`, {
        headers: { "Cache-Control": "no-cache" }
      });
      if (res.ok) {
        const data = await res.json();
        setThread(data.thread);
        setMessages(data.messages || []);
        setRoleType(data.roleType || "none");
      }
    } catch (err) {
      console.error("Error fetching negotiations:", err);
    } finally {
      setIsLoading(false);
    }
  }, [claim.id]);

  useEffect(() => {
    fetchNegotiations();
    const interval = setInterval(fetchNegotiations, 5000); // Polling for updates
    return () => clearInterval(interval);
  }, [fetchNegotiations]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    if (messageType === "counter_offer") {
      const amt = parseFloat(counterAmount);
      if (isNaN(amt) || amt <= 0) {
        error("Invalid Amount", "Please enter a valid positive counter-offer amount.");
        return;
      }
    }

    setIsSending(true);
    try {
      const body: any = {
        messageType,
        content: content.trim(),
        currency: "USD"
      };
      if (messageType === "counter_offer") {
        body.counterOfferAmount = parseFloat(counterAmount);
      }

      const res = await fetch(`/api/claims/${claim.id}/negotiations/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        error("Message Failed", data.error || "Could not send message.");
        return;
      }

      setContent("");
      setCounterAmount("");
      setMessageType("text");
      await fetchNegotiations();
      success(
        messageType === "counter_offer" ? "Counter-Offer Sent" : "Message Sent",
        "Your update has been appended to the negotiation thread."
      );
    } catch {
      error("Error", "Failed to communicate with negotiation server.");
    } finally {
      setIsSending(false);
    }
  };

  const handleRespondOffer = async (messageId: string, decision: "Accepted" | "Rejected") => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/claims/${claim.id}/negotiations/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageId, decision })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        error("Action Failed", data.error || "Could not respond to counter-offer.");
        return;
      }

      await fetchNegotiations();
      if (decision === "Accepted") {
        success(
          "Counter-Offer Accepted",
          "Proposed settlement recorded. Pending Supervisor final confirmation."
        );
      } else {
        info("Counter-Offer Rejected", "The counter-offer was formally declined.");
      }
    } catch {
      error("Error", "Failed to process response.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSupervisorConfirm = async () => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/claims/${claim.id}/negotiations/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        error("Confirmation Failed", data.error || "Could not confirm settlement.");
        return;
      }

      await fetchNegotiations();
      success(
        "Settlement Confirmed",
        "The agreed demurrage amount has been officially confirmed and committed to the claim ledger."
      );
    } catch {
      error("Error", "Failed to confirm settlement.");
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
        Loading secure negotiation room...
      </div>
    );
  }

  const isOversight = roleType === "oversight";
  const isProcessor = roleType === "processor" || role === "Supervisor" || role === "Admin";
  const canPostMessages = roleType === "client" || roleType === "processor";

  return (
    <div className="space-y-6 text-xs text-left">
      {/* Header Banner */}
      <Card className="border border-slate-200 shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Handshake className="h-4 w-4 text-blue-600" />
                <CardTitle className="text-sm font-bold text-slate-900">
                  Direct Counterparty Commercial Negotiation
                </CardTitle>
                <Badge
                  className={
                    thread?.status === "Settled"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : thread?.status === "Pending Approval"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }
                >
                  {thread?.status || "Open"}
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Direct negotiation thread between Client ({claim.accountName}) and Assigned Processor ({claim.assignedTo}).
                {isOversight && " (Supervisor / Admin Read-Only Oversight Mode)"}
              </CardDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchNegotiations}
                className="h-8 text-xs font-medium"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Claim Filed Amount</span>
              <span className="text-sm font-bold text-slate-900">{formatCurrency(claim.claimFiledAmount)}</span>
            </div>
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100">
              <span className="text-[10px] text-blue-600 block font-semibold uppercase">Proposed Settlement</span>
              <span className="text-sm font-bold text-blue-700">
                {thread?.proposedAgreedAmount ? formatCurrency(thread.proposedAgreedAmount) : "None pending"}
              </span>
            </div>
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <span className="text-[10px] text-emerald-600 block font-semibold uppercase">Confirmed Agreed Amount</span>
              <span className="text-sm font-bold text-emerald-700">
                {formatCurrency(claim.agreedAmount || 0)}
              </span>
            </div>
          </div>

          {/* Supervisor Action Box if Pending Approval */}
          {thread?.status === "Pending Approval" && thread.proposedAgreedAmount && (
            <div className="mt-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-amber-900 text-xs">Supervisor Settlement Confirmation Required</h4>
                  <p className="text-[11px] text-amber-700 mt-0.5">
                    A counter-offer of <strong>{formatCurrency(thread.proposedAgreedAmount)}</strong> was accepted by the assigned Processor. Confirm to apply to the active claims ledger.
                  </p>
                </div>
              </div>

              {canSettleClaim && (
                <Button
                  size="sm"
                  onClick={handleSupervisorConfirm}
                  disabled={actionLoading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shrink-0"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Confirm & Commit Amount
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Messages Thread Container */}
      <Card className="border border-slate-200 shadow-2xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
            Append-Only Communication Log ({messages.length} messages)
          </CardTitle>
        </CardHeader>

        <CardContent className="pt-4 space-y-3">
          {messages.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No negotiation messages yet. Start commercial discussions below.
            </div>
          ) : (
            <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
              {messages.map((msg) => {
                const isClientMsg = msg.senderRole === "Client";
                const isOffer = msg.messageType === "counter_offer";

                return (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-xl border transition ${
                      isOffer
                        ? "bg-blue-50/40 border-blue-200"
                        : isClientMsg
                        ? "bg-slate-50 border-slate-200"
                        : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs">{msg.senderName}</span>
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-semibold">
                          {msg.senderRole}
                        </Badge>
                        {isOffer && (
                          <Badge className="bg-blue-600 text-white text-[10px] py-0 px-1.5 font-bold">
                            Counter-Offer
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">{formatDate(msg.createdAt)}</span>
                    </div>

                    <p className="text-xs text-slate-700 whitespace-pre-wrap">{msg.content}</p>

                    {isOffer && (
                      <div className="mt-3 pt-2.5 border-t border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500">Offered Settlement:</span>
                          <span className="text-sm font-bold text-blue-700">
                            {formatCurrency(msg.counterOfferAmount || 0)} {msg.currency}
                          </span>
                          {msg.counterOfferStatus && (
                            <Badge
                              className={`text-[10px] py-0 px-1.5 font-semibold ${
                                msg.counterOfferStatus === "Accepted"
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                  : msg.counterOfferStatus === "Rejected"
                                  ? "bg-rose-50 text-rose-700 border-rose-200"
                                  : "bg-amber-50 text-amber-700 border-amber-200"
                              }`}
                            >
                              Status: {msg.counterOfferStatus}
                            </Badge>
                          )}
                        </div>

                        {/* Action buttons for Processor if offer is pending */}
                        {msg.counterOfferStatus === "Pending" && isProcessor && !isOversight && (
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRespondOffer(msg.id, "Rejected")}
                              disabled={actionLoading}
                              className="text-rose-600 hover:bg-rose-50 h-7 text-xs font-semibold"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Decline
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleRespondOffer(msg.id, "Accepted")}
                              disabled={actionLoading}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white h-7 text-xs font-semibold"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Accept Offer
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* New Message Composer */}
          {canPostMessages ? (
            <form onSubmit={handleSendMessage} className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="radio"
                    name="msgType"
                    checked={messageType === "text"}
                    onChange={() => setMessageType("text")}
                    className="text-blue-600"
                  />
                  <span>Text Message</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-700">
                  <input
                    type="radio"
                    name="msgType"
                    checked={messageType === "counter_offer"}
                    onChange={() => setMessageType("counter_offer")}
                    className="text-blue-600"
                  />
                  <span className="font-bold text-blue-700">Propose Counter-Offer</span>
                </label>
              </div>

              {messageType === "counter_offer" && (
                <div className="p-3 bg-blue-50/40 rounded-xl border border-blue-100 space-y-1">
                  <label className="text-[11px] font-bold text-blue-900 block">
                    Counter-Offer Amount (USD) *
                  </label>
                  <Input
                    type="number"
                    step="any"
                    placeholder="e.g. 42500"
                    value={counterAmount}
                    onChange={(e) => setCounterAmount(e.target.value)}
                    required
                    className="bg-white"
                  />
                </div>
              )}

              <div className="space-y-1">
                <textarea
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={
                    messageType === "counter_offer"
                      ? "Explain the commercial basis and contractual justification for this offer..."
                      : "Type your message to the counterparty..."
                  }
                  required
                  maxLength={2000}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
                />
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400">
                  Messages are append-only. Maximum 2000 characters.
                </span>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSending || !content.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                >
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                  {isSending ? "Sending..." : messageType === "counter_offer" ? "Submit Counter-Offer" : "Send Message"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
              <Eye className="h-4 w-4 mx-auto mb-1 text-slate-400" />
              You have read-only oversight permissions in this negotiation room.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
