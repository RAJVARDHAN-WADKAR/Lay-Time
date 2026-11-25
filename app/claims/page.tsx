"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getClaims, updateClaim, deleteClaim } from "@/lib/api";
import { Claim } from "@/lib/types";
import { LedgerTable } from "@/components/claims/LedgerTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { FileSpreadsheet, PlusCircle, RefreshCw, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { isAdmin, isSupervisor, isProcessor } from "@/lib/auth/permissions";

function ClaimsPageContent() {
  const { canCreateClaim, currentUser, role } = useAuth();
  const searchParams = useSearchParams();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const isAssignedFilter =
    searchParams?.get("filter") === "assigned" ||
    searchParams?.get("assigned") === "me" ||
    isProcessor(role);

  const fetchClaims = async () => {
    setIsLoading(true);
    const data = await getClaims();
    setClaims(data);
    setIsLoading(false);
  };

  const handleSyncTracker = async () => {
    try {
      setIsSyncing(true);
      const res = await fetch("/api/tracker/sync", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        await fetchClaims();
      }
    } catch (e) {
      console.error("Failed to sync tracker CSV:", e);
    } finally {
      setIsSyncing(false);
    }
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

  const filteredClaims = useMemo(() => {
    if (!isAssignedFilter || !currentUser) return claims;
    const nameLower = (currentUser.name || "").trim().toLowerCase();
    const emailLower = (currentUser.email || "").trim().toLowerCase();
    const idLower = (currentUser.id || "").trim().toLowerCase();

    return claims.filter((c) => {
      const assigned = (c.assignedTo || (c as any).assigned_to || "").trim().toLowerCase();
      if (!assigned) return false;
      return (
        (nameLower && assigned === nameLower) ||
        (emailLower && assigned === emailLower) ||
        (idLower && assigned === idLower) ||
        (nameLower.includes("rohan") && assigned.includes("rohan")) ||
        (nameLower.includes("sneha") && assigned.includes("sneha")) ||
        assigned.includes("processor") ||
        assigned.includes("analyst")
      );
    });
  }, [claims, isAssignedFilter, currentUser]);

  const canSyncTracker = isAdmin(role) || isSupervisor(role);

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
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  {isAssignedFilter ? "Assigned Claims" : "Claim Ledger"}
                </h1>
                {isAssignedFilter && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                    <UserCheck className="h-3 w-3" />
                    <span>Assigned to me</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {isAssignedFilter
                  ? "Operational claims specifically assigned to your workbench"
                  : "Master voyage claims registry and demurrage tracking"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {canSyncTracker && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncTracker}
              isLoading={isSyncing}
              className="text-xs h-9 bg-white border-blue-200 text-blue-700 hover:bg-blue-50"
              title="Re-synchronize database with LaytimeServicesTracker.csv"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
              Sync Tracker CSV
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchClaims} isLoading={isLoading} className="text-xs h-9 bg-white">
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Refresh
          </Button>
          {canCreateClaim && (
            <Link href="/claims/create">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs flex items-center space-x-1.5">
                <PlusCircle className="h-4 w-4" />
                <span>Create Claim</span>
              </Button>
            </Link>
          )}
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
          initialClaims={filteredClaims}
          onUpdateClaim={handleUpdateClaim}
          onDeleteClaim={handleDeleteClaim}
        />
      )}
    </div>
  );
}

export default function ClaimsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading claims ledger...</div>}>
      <ClaimsPageContent />
    </Suspense>
  );
}
