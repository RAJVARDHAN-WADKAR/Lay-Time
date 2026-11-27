"use client";

import React, { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { getClaims, updateClaim, deleteClaim } from "@/lib/api";
import { Claim } from "@/lib/types";
import { LedgerTable } from "@/components/claims/LedgerTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataErrorBanner } from "@/components/ui/data-error-banner";
import Link from "next/link";
import { FileSpreadsheet, PlusCircle, RefreshCw, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { useToast } from "@/lib/hooks/useToast";

function AssignedClaimsContent() {
  const { canCreateClaim, currentUser } = useAuth();
  const { success, error: toastError } = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchClaims = useCallback(async (isManualRefresh = false) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getClaims();
      setClaims(data);
      if (isManualRefresh) {
        success("Claims Refreshed", `Loaded ${data.length} assigned claims from server.`);
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load assigned claims from server.";
      setLoadError(msg);
      if (isManualRefresh) {
        toastError("Refresh Failed", msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [success, toastError]);

  useEffect(() => {
    fetchClaims(false);
  }, [fetchClaims]);

  const assignedClaims = useMemo(() => {
    if (!currentUser) return claims;
    const nameLower = (currentUser.name || "").trim().toLowerCase();
    const emailLower = (currentUser.email || "").trim().toLowerCase();
    const idLower = (currentUser.id || "").trim().toLowerCase();

    return claims.filter((c) => {
      const assigned = (c.assignedTo || (c as any).assigned_to || "").trim().toLowerCase();
      if (!assigned) return false;
      return (
        (nameLower !== "" && assigned === nameLower) ||
        (emailLower !== "" && assigned === emailLower) ||
        (idLower !== "" && assigned === idLower)
      );
    });
  }, [claims, currentUser]);

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
        <div className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Assigned Claims
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                <UserCheck className="h-3 w-3" />
                <span>Assigned to me</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Operational claims strictly assigned to {currentUser?.name || "your workbench"}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchClaims(true)}
            isLoading={isLoading}
            className="text-xs h-9 bg-white cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {canCreateClaim && (
            <Link href="/claims/create">
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 px-4 rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer">
                <PlusCircle className="h-4 w-4" />
                <span>Create Claim</span>
              </Button>
            </Link>
          )}
        </div>
      </div>

      {loadError && (
        <DataErrorBanner
          title="Unable to load assigned claims"
          message={loadError}
          onRetry={() => fetchClaims(true)}
          isRetrying={isLoading}
        />
      )}

      {isLoading ? (
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl">
          <CardContent className="p-12 text-center text-slate-400">
            <div className="animate-spin h-6 w-6 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2" />
            <p className="text-xs">Loading assigned claims...</p>
          </CardContent>
        </Card>
      ) : (
        <LedgerTable
          initialClaims={assignedClaims}
          onUpdateClaim={handleUpdateClaim}
          onDeleteClaim={handleDeleteClaim}
        />
      )}
    </div>
  );
}

export default function AssignedClaimsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-xs text-slate-500">Loading assigned claims...</div>}>
      <AssignedClaimsContent />
    </Suspense>
  );
}
