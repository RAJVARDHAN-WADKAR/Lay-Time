"use client";

import React, { useState, useEffect, useRef } from "react";
import { getClaims } from "@/lib/api";
import { Claim } from "@/lib/types";
import { queryAiAssistant } from "@/lib/mock/assistant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/inputs";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  User,
  Send,
  Sparkles,
  Info,
  FileCheck,
  HelpCircle,
  RotateCcw,
  BookOpen,
} from "lucide-react";

interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  citation?: string;
  timestamp: string;
  confidenceScore?: number;
}

export default function AiAssistantPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "msg-0",
      sender: "assistant",
      text: "Hello! I am your AI Demurrage & Laytime Claim Assistant. Ask me about specific vessels, weather deductions, OCR discrepancies, or timebarred claims grounded in your active claims dataset.",
      citation: "Charterparty Laytime Intelligence Engine v1.0",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const data = await getClaims();
      setClaims(data);
    }
    load();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const quickPrompts = [
    "What is the demurrage calculated for MV Nordic Voyager?",
    "Are there any timebarred claims in the system?",
    "What were the OCR discrepancies found in MV Baltic Trader?",
    "Give me an overview of total demurrage exposure across all accounts.",
    "Explain how weather deductions are applied under charterparty rules.",
  ];

  const handleSend = (textToSend?: string) => {
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

    // Simulate natural AI thinking delay (400-600ms)
    setTimeout(() => {
      const response = queryAiAssistant(queryText, claims);
      const assistantMsg: ChatMessage = {
        id: `msg-assistant-${Date.now()}`,
        sender: "assistant",
        text: response.answer,
        citation: response.citation,
        confidenceScore: response.confidenceScore,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 500);
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">AI Claim Assistant</h1>
            <Badge variant="purple" className="flex items-center space-x-1">
              <Sparkles className="h-3 w-3 mr-0.5" />
              <span>Grounded Mock RAG</span>
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Query active claims, SoF extractions, timebar deadlines, and laytime computations.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleResetChat} className="text-xs text-slate-500">
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Clear Conversation
        </Button>
      </div>

      {/* RAG Banner Notice */}
      <div className="p-3 bg-amber-50/80 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-2">
          <Info className="h-4 w-4 text-amber-600 shrink-0" />
          <span>
            <strong>Demo Architecture:</strong> This assistant is grounded in the current application state via <code>lib/mock/assistant.ts</code> and returns source-cited answers or deterministic fallbacks.
          </span>
        </div>
        <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider hidden sm:inline">
          Mock Seam
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
                  className={`max-w-xl rounded-2xl p-4 text-xs leading-relaxed space-y-2 ${
                    isUser
                      ? "bg-slate-900 text-white rounded-tr-xs"
                      : "bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-xs shadow-2xs"
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.text}</div>

                  {/* Citation line if assistant */}
                  {!isUser && msg.citation && (
                    <div className="pt-2 border-t border-slate-200/80 flex items-center space-x-1.5 text-[11px] text-blue-700 font-medium">
                      <BookOpen className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                      <span className="truncate">Source: {msg.citation}</span>
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
                <span className="text-[11px] text-slate-400 pl-1">Scanning claim ledger & Statement of Facts...</span>
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
            placeholder="Ask anything about claims, demurrage rates, rain deductions, timebars..."
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
