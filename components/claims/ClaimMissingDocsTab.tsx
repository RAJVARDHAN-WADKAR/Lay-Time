"use client";

import React, { useState, useEffect } from "react";
import { Claim } from "@/lib/types";
import { getMissingDocsCheck } from "@/lib/api/claims";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, AlertTriangle, FileCheck, FileWarning, UploadCloud } from "lucide-react";
import Link from "next/link";

interface ClaimMissingDocsTabProps {
  claim: Claim;
}

export function ClaimMissingDocsTab({ claim }: ClaimMissingDocsTabProps) {
  const [audit, setAudit] = useState<{
    isCompliant: boolean;
    uploadedCount: number;
    mandatoryCategories: string[];
    missingDocuments: string[];
    uploadedCategories: string[];
    submissionAllowed: boolean;
  } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMissingDocsCheck(claim.id)
      .then(setAudit)
      .catch(() => setAudit(null))
      .finally(() => setLoading(false));
  }, [claim.id]);

  if (loading) {
    return <div className="p-8 text-center text-xs text-slate-400">Auditing required claim documents...</div>;
  }

  if (!audit) {
    return <div className="p-8 text-center text-xs text-slate-400">Failed to verify document requirements.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header Alert */}
      <div className={`p-5 rounded-2xl border shadow-2xs flex items-center justify-between ${
        audit.isCompliant ? "bg-emerald-50/70 border-emerald-200" : "bg-rose-50/70 border-rose-200"
      }`}>
        <div className="flex items-center space-x-3">
          <div className={`p-2.5 rounded-xl ${audit.isCompliant ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
            {audit.isCompliant ? <ShieldCheck className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
          </div>
          <div>
            <h3 className={`text-sm font-bold ${audit.isCompliant ? "text-emerald-900" : "text-rose-900"}`}>
              {audit.isCompliant ? "All Mandatory Documents Verified" : "Missing Mandatory Supporting Documents"}
            </h3>
            <p className={`text-xs ${audit.isCompliant ? "text-emerald-700" : "text-rose-700"}`}>
              {audit.isCompliant
                ? `All required evidentiary records for ${claim.claimType} are present. Claim submission is authorized.`
                : `Claim submission is blocked until all mandatory contractual documents are uploaded.`}
            </p>
          </div>
        </div>

        <Link href="/documents">
          <Button size="sm" variant="outline" className="text-xs h-9 bg-white">
            <UploadCloud className="h-4 w-4 mr-1.5" />
            <span>Upload Document</span>
          </Button>
        </Link>
      </div>

      {/* Audit Checklist Card */}
      <Card className="p-5 space-y-4">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Contractual Document Checklist for {claim.claimType}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {audit.mandatoryCategories.map((cat) => {
            const isPresent = !audit.missingDocuments.includes(cat);
            return (
              <div
                key={cat}
                className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition ${
                  isPresent
                    ? "bg-emerald-50/40 border-emerald-200 text-emerald-900"
                    : "bg-rose-50/40 border-rose-200 text-rose-900"
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  {isPresent ? (
                    <FileCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                  ) : (
                    <FileWarning className="h-4 w-4 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <span className="font-bold">{cat}</span>
                    <span className="text-[10px] text-slate-500 block">
                      {isPresent ? "Uploaded & Linked" : "Mandatory - Missing"}
                    </span>
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  isPresent ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                }`}>
                  {isPresent ? "VALID" : "REQUIRED"}
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
