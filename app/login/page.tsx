"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Anchor, Lock, Mail, ArrowRight, ShieldCheck, Ship, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const { login, isLoading: authLoading } = useAuth();

  const [email, setEmail] = useState("processor@laytime.com");
  const [password, setPassword] = useState("Processor@123");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your email.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        router.push(from);
      } else {
        setError(res.error || "Invalid credentials.");
      }
    } catch {
      setError("Authentication failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const quickLoginAs = async (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
    setError(null);
    setIsLoading(true);
    const res = await login(userEmail, userPass);
    if (res.success) {
      router.push(from);
    } else {
      setError(res.error || "Login failed.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md z-10">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-900/40 mb-4 items-center justify-center">
          <Anchor className="h-8 w-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          LAYTIME SYSTEM
        </h1>
        <p className="text-xs text-blue-400 font-semibold tracking-wider uppercase mt-1">
          Demurrage & RAC Management Platform
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
        <div className="mb-6">
          <h2 className="text-lg font-bold text-white">Sign In to Workspace</h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter your corporate credentials to access the claims ledger and calculation engines.
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-2.5 text-rose-400 text-xs animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Corporate Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@laytime.com"
                required
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isLoading || authLoading}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm h-11 rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center space-x-2 transition cursor-pointer mt-2"
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Quick Role-Switcher Login for Evaluators */}
        <div className="mt-8 pt-6 border-t border-slate-800/80">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 text-center">
            Quick Role Login (One-Click)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => quickLoginAs("admin@laytime.com", "Admin@123")}
              className="p-2.5 bg-slate-950 hover:bg-purple-950/40 border border-slate-800 hover:border-purple-500/50 rounded-xl text-left transition group cursor-pointer"
            >
              <div className="text-xs font-bold text-purple-400 group-hover:text-purple-300">Admin</div>
              <div className="text-[10px] text-slate-400 truncate">Capt. Drake (Full)</div>
            </button>

            <button
              type="button"
              onClick={() => quickLoginAs("processor@laytime.com", "Processor@123")}
              className="p-2.5 bg-slate-950 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-500/50 rounded-xl text-left transition group cursor-pointer"
            >
              <div className="text-xs font-bold text-blue-400 group-hover:text-blue-300">Claim Processor</div>
              <div className="text-[10px] text-slate-400 truncate">Sarah Jenkins (Assigned)</div>
            </button>

            <button
              type="button"
              onClick={() => quickLoginAs("supervisor@laytime.com", "Supervisor@123")}
              className="p-2.5 bg-slate-950 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/50 rounded-xl text-left transition group cursor-pointer"
            >
              <div className="text-xs font-bold text-amber-400 group-hover:text-amber-300">Supervisor</div>
              <div className="text-[10px] text-slate-400 truncate">Marcus Vance (All Edit)</div>
            </button>

            <button
              type="button"
              onClick={() => quickLoginAs("reviewer@laytime.com", "Reviewer@123")}
              className="p-2.5 bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/50 rounded-xl text-left transition group cursor-pointer"
            >
              <div className="text-xs font-bold text-emerald-400 group-hover:text-emerald-300">Reviewer</div>
              <div className="text-[10px] text-slate-400 truncate">Elena Rostova (Read-Only)</div>
            </button>
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span>AES-256 Encrypted Session & Bcrypt Hashed Authentication</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />

      <Suspense fallback={<div className="text-white text-xs">Loading login workspace...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
