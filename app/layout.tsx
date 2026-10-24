import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthContext";
import { ToastProvider } from "@/lib/hooks/useToast";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "DemurrageOps — Enterprise Laytime & Claim Intelligence Platform",
  description:
    "Next-generation maritime demurrage claim management, automated Statement of Facts discrepancy detection, and laytime reconciliation engine."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans antialiased bg-slate-50 text-slate-900">
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
