"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import { Anchor, Lock, User, ArrowRight, ShieldCheck, Ship, Waves, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/inputs";
import { Modal } from "@/components/ui/modal";

export default function LoginPage() {
  const router = useRouter();
  const { loginAs } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError("Please enter your username.");
      return;
    }
    if (!password.trim()) {
      setError("Please enter your password.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Authenticate session with provided username
      loginAs("Claim Processor", username.trim(), `${username.trim().toLowerCase()}@shipping-ops.com`);
      setIsLoading(false);
      router.push("/dashboard");
    } catch {
      setError("Authentication failed. Please try again.");
      setIsLoading(false);
    }
  };

  const handleForgotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (forgotEmail) {
      setForgotSent(true);
      setTimeout(() => {
        setIsForgotModalOpen(false);
        setForgotSent(false);
        setForgotEmail("");
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row w-full">
      {/* LEFT SIDE: Maritime/Shipping Theme with Dark Overlay */}
      <div className="relative md:w-1/2 bg-gradient-to-br from-[#071224] via-[#0B192C] to-[#1E3E62] text-white p-8 sm:p-12 lg:p-16 flex flex-col justify-between overflow-hidden">
        {/* Subtle Maritime Background Graphic Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Decorative Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-[100px] pointer-events-none" />

        {/* Top Branding */}
        <div className="relative z-10 space-y-4">
          <div className="flex items-center space-x-3.5">
            <div className="h-12 w-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/40">
              <Anchor className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-wider text-white leading-none">
                LAYTIME
              </h1>
              <h2 className="text-xs font-extrabold tracking-widest text-blue-400 uppercase mt-1">
                CALCULATION SYSTEM
              </h2>
            </div>
          </div>
          <p className="text-xs font-semibold text-slate-300 tracking-wide uppercase">
            Maritime Claim Management
          </p>
        </div>

        {/* Mid Hero Info */}
        <div className="relative z-10 my-12 space-y-6 max-w-lg">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-300 text-xs font-semibold backdrop-blur-sm">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            <span>Commercial Laytime & Demurrage Platform</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-snug">
            Precision Shipping Demurrage & Claims Intelligence.
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            Enterprise laytime calculations, Statement of Facts auditing, multi-berth prorata splits, and formal settlement statement reporting for global maritime operations.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="font-bold text-sm text-blue-400 flex items-center space-x-1.5">
                <Calculator className="h-4 w-4" />
                <span>Deterministic Math</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Zero rounding errors across complex weather & berth clauses.
              </div>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
              <div className="font-bold text-sm text-emerald-400 flex items-center space-x-1.5">
                <Ship className="h-4 w-4" />
                <span>Voyage Ledgers</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Comprehensive tracking of claims, timebars, and cash recovery.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Tagline */}
        <div className="relative z-10 text-[11px] text-slate-400">
          Professional Maritime SaaS • Secure Claims Accounting
        </div>
      </div>

      {/* RIGHT SIDE: Clean Sign In Form */}
      <div className="md:w-1/2 bg-white flex flex-col justify-between p-8 sm:p-12 lg:p-16">
        <div className="max-w-md w-full mx-auto my-auto space-y-8">
          {/* Form Header */}
          <div className="space-y-2 text-left">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Welcome Back!
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Please sign in to your account
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSignIn} className="space-y-5">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Username */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-700 block">Username</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition bg-slate-50/50"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5 text-left">
              <label className="text-xs font-bold text-slate-700 block">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition bg-slate-50/50"
                />
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center space-x-2 cursor-pointer select-none text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => setIsForgotModalOpen(true)}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                Forgot Password?
              </button>
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-11 rounded-xl shadow-md shadow-blue-600/25 flex items-center justify-center space-x-2"
            >
              <span>Sign In</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>

        {/* Bottom Copyright */}
        <div className="text-center pt-8 text-xs text-slate-400 font-medium">
          © 2026 Laytime Calculation System
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Modal
        isOpen={isForgotModalOpen}
        onClose={() => setIsForgotModalOpen(false)}
        title="Reset Password"
        maxWidth="sm"
      >
        <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs">
          <p className="text-slate-600">
            Enter your registered email address and we will send you password reset instructions.
          </p>

          {forgotSent ? (
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg font-medium border border-emerald-200">
              Password reset link sent to {forgotEmail}!
            </div>
          ) : (
            <>
              <div className="space-y-1 text-left">
                <label className="font-bold text-slate-700">Email Address</label>
                <Input
                  type="email"
                  placeholder="name@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setIsForgotModalOpen(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Send Reset Link
                </Button>
              </div>
            </>
          )}
        </form>
      </Modal>
    </div>
  );
}
