"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    // Navigate directly to dashboard
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
      <div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full" />
    </div>
  );
}
