const fs = require('fs');
const path = require('path');

const code = `"use client";

import React, { useState, useEffect } from "react";
import { getDocuments, uploadDocument, updateDocumentStatus, deleteDocument, getClaims } from "@/lib/api";
import { DocumentRecord, Claim } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/inputs";
import { formatDateTime } from "@/lib/utils/formatters";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  ScanText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Trash2,
  ArrowRight,
  RefreshCw,
  FileCode,
} from "lucide-react";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fetchAll = async () => {
    setIsLoading(true);
    const [docs, cls] = await Promise.all([getDocuments(), getClaims()]);
    setDocuments(docs);
    setClaims(cls);
    if (cls.length > 0 && !selectedClaimId) {
      setSelectedClaimId(cls[0].id);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleSimulateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".pdf") && file.type !== "application/pdf") {
      setUploadError("Only PDF documents are supported for Statement of Facts extraction.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError("File size exceeds the 15MB limit.");
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    const targetClaim = claims.find((c) => c.id === selectedClaimId) || claims[0];

    // 1. Initial status: Uploaded
    const newDoc = await uploadDocument(
      { name: file.name, size: file.size, type: file.type },
      targetClaim.id,
      targetClaim.claimName
    );
    setDocuments((prev) => [newDoc, ...prev]);

    // 2. Simulate pipeline: OCR Processing... (after 800ms)
    setTimeout(async () => {
      const processing = await updateDocumentStatus(newDoc.id, "OCR Processing...");
      setDocuments((prev) => prev.map((d) => (d.id === newDoc.id ? processing : d)));

      // 3. Simulate pipeline: OCR Completed or Failed (after another 1200ms)
      setTimeout(async () => {
        const isBad = file.name.toLowerCase().includes("bad") || file.name.toLowerCase().includes("corrupt") || file.name.toLowerCase().includes("fail");
        const finalStatus = isBad ? "OCR Failed" : "OCR Completed";
        const completed = await updateDocumentStatus(newDoc.id, finalStatus, isBad ? 0 : 6);
        setDocuments((prev) => prev.map((d) => (d.id === newDoc.id ? completed : d)));
        setIsUploading(false);
      }, 1400);
    }, 800);
  };

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Voyage Documents & OCR Pipeline</h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulated OCR pipeline processing scanned Statement of Facts PDFs with real deterministic discrepancy verification.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Link href="/ocr">
            <Button className="flex items-center space-x-1.5 text-xs">
              <ScanText className="h-4 w-4" />
              <span>Review Extracted SoF</span>
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={fetchAll} isLoading={isLoading}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Drag and Drop Upload Card */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Upload Statement of Facts (PDF)</h3>
              <p className="text-xs text-slate-500">Attach to an active claim and trigger mock OCR extraction engine</p>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-500 whitespace-nowrap">Target Claim:</span>
              <Select
                value={selectedClaimId}
                onChange={(e) => setSelectedClaimId(e.target.value)}
                className="w-64 text-xs h-8"
              >
                {claims.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} — {c.shipName}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <label className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-blue-50/20 text-center block">
            <input
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleSimulateUpload}
              disabled={isUploading}
              className="hidden"
            />
            <div className="p-3 bg-blue-100 text-blue-600 rounded-full mb-3 shadow-xs">
              {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <UploadCloud className="h-6 w-6" />}
            </div>
            <span className="text-sm font-semibold text-slate-800">
              {isUploading ? "Uploading & Triggering OCR Engine..." : "Click or Drag PDF Statement of Facts Here"}
            </span>
            <span className="text-xs text-slate-400 mt-1">
              Supports standard PDFs up to 15MB. (Tip: Try naming file with \"bad_scan.pdf\" to test simulated OCR failure)
            </span>
          </label>

          {uploadError && (
            <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-md flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Documents Processed List */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">Document Processing Queue & History</CardTitle>
            <CardDescription>Pipeline execution states and extracted SoF event totals</CardDescription>
          </div>
          <span className="text-xs font-semibold text-slate-500">{documents.length} Files</span>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[10px] font-semibold">
                <tr>
                  <th className="p-3.5">File Name</th>
                  <th className="p-3.5">Associated Claim</th>
                  <th className="p-3.5">Uploaded</th>
                  <th className="p-3.5">OCR Status</th>
                  <th className="p-3.5">Confidence</th>
                  <th className="p-3.5">Extracted Items</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {documents.map((doc) => {
                  const isProcessing = doc.status === "OCR Processing..." || doc.status === "Uploaded";
                  const isFailed = doc.status === "OCR Failed";

                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-medium text-slate-900">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                          <span className="truncate max-w-xs">{doc.fileName}</span>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <Link href={\`/claims/\${doc.claimId}\`} className="text-blue-600 hover:underline">
                          {doc.claimId}
                        </Link>
                      </td>
                      <td className="p-3.5 text-slate-500">{formatDateTime(doc.uploadedAt)}</td>
                      <td className="p-3.5">
                        {isProcessing ? (
                          <span className="inline-flex items-center text-blue-600 font-semibold">
                            <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                            {doc.status}
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center text-rose-600 font-semibold" title={doc.errorReason}>
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            OCR Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-emerald-600 font-semibold">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                            Completed
                          </span>
                        )}
                      </td>
                      <td className="p-3.5 font-medium">
                        {doc.ocrConfidence ? (
                          <span
                            className={
                              doc.ocrConfidence >= 0.8 ? "text-emerald-700 font-bold" : "text-amber-700 font-bold"
                            }
                          >
                            {Math.round(doc.ocrConfidence * 100)}%
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="p-3.5 font-semibold text-slate-800">
                        {doc.extractedItemsCount ? \`\${doc.extractedItemsCount} activities\` : "—"}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          {doc.status === "OCR Completed" && (
                            <Link href="/ocr">
                              <Button variant="outline" size="sm" className="h-7 text-xs text-blue-600">
                                <span>View Extracted SoF</span>
                                <ArrowRight className="h-3 w-3 ml-1" />
                              </Button>
                            </Link>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(doc.id)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
`;

fs.writeFileSync(path.join(process.cwd(), 'app/documents/page.tsx'), code, 'utf8');
console.log('Successfully wrote app/documents/page.tsx');
