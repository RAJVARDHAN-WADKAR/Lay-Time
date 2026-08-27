const fs = require('fs');
const path = require('path');

const layoutCode = `import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthContext";
import { ToastProvider } from "@/lib/hooks/useToast";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { DemoBadge } from "@/components/layout/DemoBadge";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Demurrage Claim Management & Laytime System",
  description: "Enterprise maritime demurrage claims ledger, statement of facts discrepancy detection, and laytime calculation engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <ToastProvider>
            <div className="flex h-screen overflow-hidden bg-slate-50">
              {/* Desktop Sidebar */}
              <div className="hidden md:flex flex-shrink-0">
                <Sidebar />
              </div>

              {/* Main content column */}
              <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
                  {children}
                </main>
                <DemoBadge />
              </div>
            </div>
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
`;

fs.writeFileSync(path.join(process.cwd(), 'app/layout.tsx'), layoutCode, 'utf8');
console.log('Updated app/layout.tsx');
