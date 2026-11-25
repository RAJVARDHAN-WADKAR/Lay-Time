"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/context/AuthContext";
import {
  Anchor,
  Compass,
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";

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

  const validate = (): { isValid: boolean; normalizedEmail: string } => {
    const errors: { email?: string; password?: string } = {};
    const trimmed = email.trim();
    let normalized = trimmed;

    if (!trimmed) {
      errors.email = "Email address or username is required.";
    } else {
      if (!normalized.includes("@")) {
        normalized = `${normalized}@laytime.io`;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(normalized)) {
        errors.email = "Please enter a valid email address (e.g. admin@laytime.io).";
      }
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    setFieldErrors(errors);
    return { isValid: Object.keys(errors).length === 0, normalizedEmail: normalized };
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const { isValid, normalizedEmail } = validate();
    if (!isValid) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await login(normalizedEmail, password);
      if (res.success) {
        router.push(from);
        router.refresh();
      } else {
        setErrorMessage(res.error || "Invalid email or password");
      }
    } catch {
      setErrorMessage("Authentication service unavailable. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md z-10 px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex p-3 bg-gradient-to-tr from-cyan-600 via-teal-500 to-blue-600 text-white rounded-2xl shadow-xl shadow-cyan-950/40 mb-4 items-center justify-center transform hover:scale-105 transition-transform duration-300">
          <Anchor className="h-8 w-8 text-white stroke-[2.2]" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <Compass className="h-5 w-5 text-cyan-400 animate-spin-slow" />
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Lay-Time
          </h1>
        </div>
        <p className="text-xs text-cyan-200/80 font-medium tracking-wide mt-1.5">
          Enterprise Demurrage &amp; Maritime Laytime Management Platform
        </p>
      </div>

      {/* Main Login Card */}
      <div className="bg-slate-900/85 border border-slate-800/90 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl">
        <div className="mb-6">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Lock className="h-4 w-4 text-cyan-400" />
            <span>Sign In to System</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Enter your authorized corporate credentials to access the workspace.
          </p>
        </div>

        {/* Global Error Alert */}
        {errorMessage && (
          <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/40 rounded-xl flex items-start space-x-2.5 text-rose-300 text-xs animate-in fade-in duration-200">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-400" />
            <span className="font-semibold">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSignIn} className="space-y-4" noValidate>
          {/* Email / Username Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="email-input">
              Email Address or Username
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="email-input"
                type="text"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: undefined });
                }}
                placeholder="admin@laytime.io or admin"
                autoComplete="username"
                required
                className={`w-full bg-slate-950/80 border rounded-xl px-10 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                  fieldErrors.email
                    ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : "border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                }`}
              />
            </div>
            {fieldErrors.email && (
              <p className="text-rose-400 text-[11px] mt-1 font-medium">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password Input + Show/Hide */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="password-input">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="password-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: undefined });
                }}
                placeholder="••••••••••••"
                autoComplete="current-password"
                required
                className={`w-full bg-slate-950/80 border rounded-xl pl-10 pr-11 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none transition ${
                  fieldErrors.password
                    ? "border-rose-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                    : "border-slate-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 rounded-md transition cursor-pointer"
                title={showPassword ? "Hide password" : "Show password"}
                aria-label={showPassword ? "Hide password" : "Show password"}
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
            className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-60 text-white font-bold text-sm h-11 rounded-xl shadow-lg shadow-cyan-950/30 flex items-center justify-center space-x-2 transition cursor-pointer mt-4"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Signing In...</span>
              </div>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </div>

      {/* Security Notice */}
      <div className="mt-6 text-center text-[11px] text-slate-400/80 flex items-center justify-center space-x-1.5">
        <Lock className="h-3 w-3 text-cyan-400/80" />
        <span>End-to-end encrypted session &bull; Role-based access control</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#030B17] via-[#07192F] to-[#0A2640] flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      <style jsx global>{`
        @keyframes driftRight {
          0% { transform: translateX(-120%); }
          100% { transform: translateX(120vw); }
        }
        @keyframes driftLeft {
          0% { transform: translateX(120vw); }
          100% { transform: translateX(-120%); }
        }
        @keyframes waveFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .ship-cargo {
          animation: driftRight 95s linear infinite;
        }
        .ship-tanker {
          animation: driftLeft 120s linear infinite;
        }
        .ship-container {
          animation: driftRight 80s linear infinite;
          animation-delay: -35s;
        }
        .wave-motion {
          animation: waveFloat 6s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .ship-cargo, .ship-tanker, .ship-container, .wave-motion {
            animation: none !important;
          }
        }
      `}</style>

      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-cyan-600/10 blur-[130px] rounded-full pointer-events-none" />

      {/* Inline-SVG Maritime Horizon & Ship Silhouettes */}
      <div className="absolute bottom-0 left-0 right-0 w-full pointer-events-none overflow-hidden h-48 sm:h-64 z-0">
        {/* Distant Sea Horizon Line */}
        <div className="absolute bottom-16 sm:bottom-20 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />

        {/* Ship 1: Cargo Ship drifting right */}
        <div className="ship-cargo absolute bottom-18 sm:bottom-22 left-0 w-28 sm:w-36 opacity-30 text-cyan-200">
          <svg viewBox="0 0 120 40" fill="currentColor" className="w-full h-auto">
            {/* Cargo ship silhouette */}
            <path d="M 5,28 L 15,35 L 105,35 L 115,28 L 105,25 L 85,25 L 85,15 L 98,15 L 98,8 L 94,8 L 94,5 L 90,5 L 90,8 L 82,8 L 82,25 L 50,25 L 50,20 L 75,20 L 75,25 L 20,25 L 20,20 L 45,20 L 45,25 L 10,25 Z" />
          </svg>
        </div>

        {/* Ship 2: Tanker drifting left */}
        <div className="ship-tanker absolute bottom-20 sm:bottom-24 left-0 w-32 sm:w-44 opacity-25 text-teal-300">
          <svg viewBox="0 0 140 40" fill="currentColor" className="w-full h-auto">
            {/* Crude oil tanker silhouette */}
            <path d="M 5,29 L 18,36 L 122,36 L 135,29 L 120,26 L 110,26 L 110,12 L 122,12 L 122,6 L 118,6 L 118,2 L 114,2 L 114,6 L 106,6 L 106,26 L 30,26 L 30,23 L 40,23 L 40,26 L 55,26 L 55,23 L 65,23 L 65,26 L 80,26 L 80,23 L 90,23 L 90,26 L 15,26 Z" />
          </svg>
        </div>

        {/* Ship 3: Container Ship drifting right */}
        <div className="ship-container absolute bottom-16 sm:bottom-19 left-0 w-24 sm:w-32 opacity-20 text-blue-300">
          <svg viewBox="0 0 110 38" fill="currentColor" className="w-full h-auto">
            {/* Container vessel with stacked tiers */}
            <path d="M 6,27 L 14,34 L 96,34 L 104,27 L 95,24 L 88,24 L 88,14 L 95,14 L 95,7 L 90,7 L 90,4 L 86,4 L 86,24 L 20,24 L 20,16 L 35,16 L 35,24 L 38,24 L 38,15 L 53,15 L 53,24 L 56,24 L 56,16 L 71,16 L 71,24 L 74,24 L 74,15 L 82,15 L 82,24 Z" />
          </svg>
        </div>

        {/* Animated Waves SVG Horizon */}
        <svg
          className="wave-motion absolute bottom-0 left-0 right-0 w-full h-16 sm:h-20 text-[#041122]/90"
          viewBox="0 0 1440 120"
          preserveAspectRatio="none"
          fill="currentColor"
        >
          <path d="M0,32L48,42.7C96,53,192,75,288,74.7C384,75,480,53,576,48C672,43,768,53,864,64C960,75,1056,85,1152,74.7C1248,64,1344,32,1392,16L1440,0L1440,120L1392,120C1344,120,1248,120,1152,120C1056,120,960,120,864,120C768,120,672,120,576,120C480,120,384,120,288,120C192,120,96,120,48,120L0,120Z" />
        </svg>

        <svg
          className="absolute bottom-0 left-0 right-0 w-full h-10 sm:h-12 text-[#020914]"
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          fill="currentColor"
        >
          <path d="M0,20L60,26.7C120,33,240,47,360,46.7C480,47,600,33,720,30C840,27,960,33,1080,40C1200,47,1320,53,1380,46.7L1440,40L1440,80L1380,80C1320,80,1200,80,1080,80C960,80,840,80,720,80C600,80,480,80,360,80C240,80,120,80,60,80L0,80Z" />
        </svg>
      </div>

      <Suspense fallback={<div className="text-white text-xs">Loading Lay-Time...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
