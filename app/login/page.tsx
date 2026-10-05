"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import {
  Anchor,
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Shield,
  CheckCircle2,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";

const DEV_ACCOUNTS = [
  {
    role: "Admin",
    email: "rajvardhanwadkar76@gmail.com",
    badgeColor: "bg-purple-950/80 text-purple-300 border-purple-700/50 hover:border-purple-500",
    desc: "Full access + User Management"
  },
  {
    role: "Claim Processor",
    email: "rohitmengane2975@gmail.com",
    badgeColor: "bg-blue-950/80 text-blue-300 border-blue-700/50 hover:border-blue-500",
    desc: "Assigned claims & SOF processing"
  },
  {
    role: "Supervisor",
    email: "swayamghatage3839@gmail.com",
    badgeColor: "bg-amber-950/80 text-amber-300 border-amber-700/50 hover:border-amber-500",
    desc: "All claims, overrides & settlement"
  },
  {
    role: "Reviewer",
    email: "paraschougale558@gmail.com",
    badgeColor: "bg-emerald-950/80 text-emerald-300 border-emerald-700/50 hover:border-emerald-500",
    desc: "Read-only inspection across all views"
  }
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") || "/dashboard";
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedEmail) {
      errors.email = "Email address is required.";
    } else if (!emailRegex.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address (e.g., name@domain.com).";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 4) {
      errors.password = "Password must be at least 4 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login(email.trim(), password);
      if (res.success) {
        router.push(from);
        router.refresh();
      } else {
        setErrorMessage(res.error || "Invalid email or password. Please verify credentials.");
      }
    } catch {
      setErrorMessage("Authentication service unavailable. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectEmail = (selectedEmail: string) => {
    setEmail(selectedEmail);
    setFieldErrors((prev) => ({ ...prev, email: undefined }));
    setErrorMessage(null);
  };

  return (
    <div className="w-full max-w-md z-10">
      {/* Brand Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex p-3 bg-blue-600 text-white rounded-2xl shadow-xl shadow-blue-900/40 mb-3 sm:mb-4 items-center justify-center transform hover:scale-105 transition-transform">
          <Anchor className="h-8 w-8" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          LAYTIME SYSTEM
        </h1>
        <p className="text-xs text-blue-400 font-semibold tracking-wider uppercase mt-1">
          Demurrage & RAC Claim Management Suite
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
        <div className="mb-5 sm:mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-500" />
            <span>Sign In to Workspace</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter your corporate credentials to access the claims ledger, calculation engines, and RAC portfolios.
          </p>
        </div>

        {/* Global Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start space-x-2.5 text-rose-400 text-xs animate-in fade-in">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4" noValidate>
          {/* Email Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Corporate Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                }}
                placeholder="name@company.com"
                autoComplete="email"
                required
                className={`w-full bg-slate-950/80 border rounded-xl px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden transition ${
                  fieldErrors.email
                    ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : "border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-rose-400 text-[11px] mt-1 font-medium">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password Input + Show/Hide */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Password
              </label>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                }}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                className={`w-full bg-slate-950/80 border rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden transition ${
                  fieldErrors.password
                    ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : "border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded-md transition cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="text-rose-400 text-[11px] mt-1 font-medium">{fieldErrors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-bold text-sm h-11 rounded-xl shadow-lg shadow-blue-900/30 flex items-center justify-center space-x-2 transition cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Authenticating...</span>
              </div>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Development Test Accounts Helper */}
        <div className="mt-7 pt-5 border-t border-slate-800/80">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Users className="h-3 w-3 text-blue-400" />
              <span>Development Test Accounts</span>
            </span>
            <span className="text-[10px] text-slate-500">Click to fill email</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {DEV_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleSelectEmail(acc.email)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer group ${acc.badgeColor}`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white group-hover:underline">
                    {acc.role}
                  </span>
                  <span className="text-[9px] font-mono opacity-70">Fill</span>
                </div>
                <div className="text-[10px] opacity-80 truncate mt-0.5" title={acc.email}>
                  {acc.email}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Security Notice */}
      <div className="mt-5 text-center text-[11px] text-slate-500 flex items-center justify-center space-x-1.5">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span>Bcrypt Password Hashing & Secure HttpOnly JWT Session Cookies</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#070F2B] flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden select-none">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 blur-[130px] rounded-full pointer-events-none" />

      <Suspense fallback={<div className="text-white text-xs">Loading authentication workspace...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
