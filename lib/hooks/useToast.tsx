"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (options: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({ title, description, type = "info", duration = 3500 }: Omit<Toast, "id">) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newToast: Toast = { id, title, description, type, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((title: string, description?: string) => {
    toast({ title, description, type: "success" });
  }, [toast]);

  const error = useCallback((title: string, description?: string) => {
    toast({ title, description, type: "error" });
  }, [toast]);

  const info = useCallback((title: string, description?: string) => {
    toast({ title, description, type: "info" });
  }, [toast]);

  const warning = useCallback((title: string, description?: string) => {
    toast({ title, description, type: "warning" });
  }, [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, info, warning }}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          const typeStyles = {
            success: "bg-emerald-900/90 border-emerald-700 text-white",
            error: "bg-rose-900/90 border-rose-700 text-white",
            warning: "bg-amber-900/90 border-amber-700 text-white",
            info: "bg-slate-900/90 border-slate-700 text-white",
          };

          const icons = {
            success: <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />,
            error: <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />,
            warning: <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />,
            info: <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />,
          };

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start justify-between p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-2 duration-200 ${
                typeStyles[t.type || "info"]
              }`}
            >
              <div className="flex items-start space-x-2.5">
                {icons[t.type || "info"]}
                <div>
                  <h5 className="text-xs font-bold leading-none">{t.title}</h5>
                  {t.description && (
                    <p className="text-[11px] opacity-80 mt-1 leading-snug">{t.description}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="opacity-60 hover:opacity-100 transition p-1 ml-2"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
