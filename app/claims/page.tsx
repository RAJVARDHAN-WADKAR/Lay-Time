"use client";

import React, { useEffect, useState } from "react";
import { getClaims, updateClaim, deleteClaim } from "@/lib/api";
import { Claim } from "@/lib/types";
import { LedgerTable } from "@/components/claims/LedgerTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileSpreadsheet, PlusCircle, RefreshCw, Ship } from "lucide-react";

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchClaims = async () => {
    setIsLoading(true);
    const data = await getClaims();
    setClaims(data);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchClaims();

    const handleStorageChange = () => {
      fetchClaims();
    };
    window.addEventListener("demurrage_storage_change", handleStorageChange);
    return () => window.removeEventListener("demurrage_storage_change", handleStorageChange);
  }, []);

  const handleUpdateClaim = async (id: string, updates: Partial<Claim>) => {
    const updated = await updateClaim(id, updates);
    setClaims((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const handleDeleteClaim = async (id: string) => {
    await deleteClaim(id);
    setClaims((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Claim Ledger
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Master voyage claims registry and demurrage tracking
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchClaims} isLoading={isLoading} className="text-xs h-9 bg-white">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
          <Link href="/claims/create">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs flex items-center space-x-1.5">
              <PlusCircle className="h-4 w-4" />
              <span>Create Claim</span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Ledger Table */}
      {isLoading ? (
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl">
          <CardContent className="p-12 text-center text-slate-400">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-xs">Loading claims ledger...</p>
          </CardContent>
        </Card>
      ) : (
        <LedgerTable
          initialClaims={claims}
          onUpdateClaim={handleUpdateClaim}
          onDeleteClaim={handleDeleteClaim}
        />
      )}
    </div>
  );
}
