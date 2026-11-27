"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { getClaims, updateClaim, deleteClaim, syncTrackerCsv } from "@/lib/api";
import { Claim } from "@/lib/types";
import { LedgerTable } from "@/components/claims/LedgerTable";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataErrorBanner } from "@/components/ui/data-error-banner";
import Link from "next/link";
import { FileSpreadsheet, PlusCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/context/AuthContext";
import { normalizeRole, can } from "@/lib/auth/accessMatrix";
import { useToast } from "@/lib/hooks/useToast";

function ClaimsPageContent() {
  const { canCreateClaim, currentUser, role } = useAuth();
  const { success, error: toastError } = useToast();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);

  const isClient = Boolean(currentUser?.clientId || (currentUser as any)?.client_id);
  const normRole = normalizeRole(role, isClient);
  const canSyncTracker = can(normRole, "tracker:sync", isClient);

  const fetchClaims = useCallback(async (isManualRefresh = false) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getClaims();
      setClaims(data);
      if (isManualRefresh) {
        success("Claims Refreshed", `Loaded ${data.length} claims from server.`);
      }
    } catch (e: any) {
      const msg = e?.message || "Failed to load claims from server.";
      setLoadError(msg);
      if (isManualRefresh) {
        toastError("Refresh Failed", msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [success, toastError]);

  const handleConfirmSyncTracker = async () => {
    setIsSyncConfirmOpen(false);
    try {
      setIsSyncing(true);
      const result = await syncTrackerCsv();
      await fetchClaims(false);
      success(
        "Tracker Sync Complete",
        `Inserted: ${result.inserted}, Skipped: ${result.skipped}, Errors: ${result.errors.length}`
      );
    } catch (e: any) {
      toastError("Tracker Sync Failed", e?.message || "Failed to sync LaytimeServicesTracker.csv");
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchClaims(false);
  }, [fetchClaims]);

  const handleUpdateClaim = async (id: string, updates: Partial<Claim>) => {
    const updated = await updateClaim(id, updates);
    setClaims((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const handleDeleteClaim = async (id: string) => {
    await deleteClaim(id);
    setClaims((prev) => prev.filter((c) => c.id !== id));
  };

  const pageTitle = normRole === "CLIENT" ? "My Claims" : "All Claims";
  const pageSubtitle =
    normRole === "CLIENT"
      ? "Read-only ledger of your company's registered voyage demurrage claims"
      : "Master voyage claims registry and demurrage tracking";

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2.5">
          <div className="h-9 w-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              {pageTitle}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{pageSubtitle}</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {canSyncTracker && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSyncConfirmOpen(true)}
              isLoading={isSyncing}
              className="text-xs h-9 bg-white border-blue-200 text-blue-700 hover:bg-blue-50 cursor-pointer"
              title="Merge new claims from LaytimeServicesTracker.csv without overwriting edited claims"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
              Sync Tracker CSV
            </Button>
          )}
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
          title="Unable to load claims ledger"
          message={loadError}
          onRetry={() => fetchClaims(true)}
          isRetrying={isLoading}
        />
      )}

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

      {canSyncTracker && (
        <ConfirmDialog
          isOpen={isSyncConfirmOpen}
          onClose={() => setIsSyncConfirmOpen(false)}
          onConfirm={handleConfirmSyncTracker}
          title="Sync LaytimeServicesTracker.csv"
          message="This will insert any new claims from LaytimeServicesTracker.csv that do not yet exist in the database. Existing claims edited in the app will NOT be overwritten."
          confirmText="Sync New Claims"
          destructive={false}
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
