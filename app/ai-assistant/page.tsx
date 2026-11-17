"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { getClaims } from "@/lib/api";
import { Claim } from "@/lib/types";
import { queryAiAssistant } from "@/lib/mock/assistant";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/inputs";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  User,
  Send,
  Sparkles,
  Info,
  RotateCcw,
  BookOpen,
  ExternalLink,
  ShieldCheck,
  ChevronRight
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  citation?: string;
  timestamp: string;
  confidenceScore?: number;
  matchedClaimId?: string;
  suggestedActions?: Array<{
    label: string;
    href?: string;
  }>;
}

export default function AiAssistantPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-0",
      sender: "assistant",
      text: "Hello! I am your AI Demurrage & Laytime Claim Assistant powered by Maritime RAG. Ask me about specific vessels, Statement of Facts deductions, OCR anomalies, charterparty clauses (BPVOY4, ASBATANKVOY, GENCON, SHELLVOY), or timebar deadlines.",
      citation: "Maritime Charterparty & Claims Knowledge Base v2.0",
      confidenceScore: 0.99,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await getClaims();
        setClaims(data);
      } catch (err) {
        console.warn("Could not load claims in assistant:", err);
      }
    }
    load();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const quickPrompts = [
    "What is the demurrage calculated for MV Nordic Voyager?",
    "How does Once on Demurrage Always on Demurrage apply under BPVOY4 Clause 18?",
    "Are there any timebarred claims in the system?",
    "What were the OCR discrepancies found in MV Baltic Trader?",
    "Give me an overview of total demurrage exposure across all accounts.",
    "Explain how weather deductions are applied under charterparty rules.",
  ];

  const handleSend = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText) return;

    const userMsg: ChatMessage = {
      id: `msg-user-${Date.now()}`,
      sender: "user",
      text: queryText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      // Call the server-side Maritime RAG API
      const res = await fetch("/api/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: queryText }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: `msg-assistant-${Date.now()}`,
          sender: "assistant",
          text: data.answer || data.response?.answer || "No response received.",
          citation: data.citation || data.response?.citation,
          confidenceScore: data.confidenceScore ?? data.response?.confidenceScore,
          matchedClaimId: data.matchedClaimId || data.response?.matchedClaimId,
          suggestedActions: data.suggestedActions || data.response?.suggestedActions,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        // Fallback to local RAG engine if server response was not 200
        const localResp = queryAiAssistant(queryText, claims);
        const assistantMsg: ChatMessage = {
          id: `msg-assistant-${Date.now()}`,
          sender: "assistant",
          text: localResp.answer,
          citation: localResp.citation,
          confidenceScore: localResp.confidenceScore,
          matchedClaimId: localResp.matchedClaimId,
          suggestedActions: localResp.suggestedActions,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      // Fallback on network error
      const localResp = queryAiAssistant(queryText, claims);
      const assistantMsg: ChatMessage = {
        id: `msg-assistant-${Date.now()}`,
        sender: "assistant",
        text: localResp.answer,
        citation: localResp.citation,
        confidenceScore: localResp.confidenceScore,
        matchedClaimId: localResp.matchedClaimId,
        suggestedActions: localResp.suggestedActions,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: "assistant",
        text: "Chat cleared. What claim or Statement of Facts clause would you like to examine?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  return (
    <div className="space-y-6 pb-8 max-w-4xl mx-auto flex flex-col h-[calc(100vh-8.5rem)]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Maritime Assistant</h1>
            <Badge variant="purple" className="flex items-center space-x-1">
              <Sparkles className="h-3 w-3 mr-0.5" />
              <span>Maritime Grounded RAG v2.0</span>
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time retrieval-augmented intelligence over active claims, Statement of Facts, OCR logs, and charterparty clauses.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleResetChat} className="text-xs text-slate-500">
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Clear Conversation
        </Button>
      </div>

      {/* RAG Banner Notice */}
      <div className="p-3 bg-blue-50/80 border border-blue-200 text-blue-900 text-xs rounded-xl flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
          <span>
            <strong>Maritime RAG Architecture:</strong> Grounded dynamically in SQLite claim records, Statement of Facts logs, and standard charterparty forms (BPVOY4, ASBATANKVOY, GENCON 94, SHELLVOY6, BIMCO 2013).
          </span>
        </div>
        <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider hidden sm:inline">
          Live RAG
        </span>
      </div>

      {/* Quick Prompts Carousel/Pills */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
          Quick Prompts:
        </span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(prompt)}
            className="whitespace-nowrap px-3 py-1 bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-full border border-slate-200 hover:border-blue-300 transition shadow-2xs text-[11px] font-medium"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Main Chat Stream Box */}
      <Card className="flex-1 border-slate-200 shadow-sm bg-white overflow-hidden flex flex-col">
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((msg) => {
            const isUser = msg.sender === "user";

            return (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${isUser ? "flex-row-reverse space-x-reverse" : ""}`}
              >
                {/* Avatar */}
                <div
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs shrink-0 shadow-xs ${
                    isUser ? "bg-slate-800 text-white" : "bg-blue-600 text-white"
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed space-y-2.5 ${
                    isUser
                      ? "bg-slate-900 text-white rounded-tr-xs"
                      : "bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Matched Claim Link Card */}
                  {!isUser && msg.matchedClaimId && (
                    <div className="pt-2 border-t border-slate-200/80">
                      <Link
                        href={`/claims/${msg.matchedClaimId}`}
                        className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-blue-100/70 hover:bg-blue-200/70 text-blue-800 font-semibold text-[11px] transition"
                      >
                        <span>Open Claim Record: {msg.matchedClaimId}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>
                  )}

                  {/* Suggested Quick Actions */}
                  {!isUser && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                    <div className="pt-2 flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((act, actIdx) => (
                        act.href ? (
                          <Link
                            key={actIdx}
                            href={act.href}
                            className="inline-flex items-center space-x-1 px-2 py-0.5 bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-700 rounded text-[10px] font-medium transition"
                          >
                            <span>{act.label}</span>
                            <ChevronRight className="h-2.5 w-2.5" />
                          </Link>
                        ) : null
                      ))}
                    </div>
                  )}

                  {/* Citation & Grounding line */}
                  {!isUser && (msg.citation || msg.confidenceScore !== undefined) && (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-[11px] text-blue-700">
                      {msg.citation && (
                        <div className="flex items-center space-x-1.5 truncate max-w-[75%]">
                          <BookOpen className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                          <span className="truncate font-medium">Source: {msg.citation}</span>
                        </div>
                      )}
                      {msg.confidenceScore !== undefined && msg.confidenceScore > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                          {Math.round(msg.confidenceScore * 100)}% Grounded
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    className={`text-[10px] ${
                      isUser ? "text-slate-400 text-right" : "text-slate-400"
                    }`}
                  >
                    {msg.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-500 flex items-center space-x-1.5">
                <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-pulse" />
                <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-pulse delay-75" />
                <div className="h-1.5 w-1.5 bg-blue-600 rounded-full animate-pulse delay-150" />
                <span className="text-[11px] text-slate-400 pl-1">Scanning claim ledger & charterparty clauses...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder="Ask anything about claims, demurrage rates, rain deductions, timebars, charter clauses..."
            className="flex-1 bg-white text-xs h-10"
          />
          <Button
            onClick={() => handleSend()}
            disabled={!input.trim() || isTyping}
            className="h-10 px-4 flex items-center space-x-1.5"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </Button>
        </div>
      </Card>
    </div>
  );
}
