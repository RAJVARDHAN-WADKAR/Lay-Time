const fs = require('fs');
const path = require('path');

const layoutCode = `import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthContext";
import { ToastProvider } from "@/lib/hooks/useToast";
import { AppShell } from "@/components/layout/AppShell";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "DemurrageOps — Enterprise Laytime & Claim Intelligence Platform",
  description: "Next-generation maritime demurrage claim management, automated Statement of Facts discrepancy detection, and laytime reconciliation engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
            <AppShell>{children}</AppShell>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
`;

fs.writeFileSync(path.join(process.cwd(), 'app/layout.tsx'), layoutCode, 'utf8');
console.log('Updated app/layout.tsx to use AppShell');
