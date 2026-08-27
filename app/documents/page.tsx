"use client";

import React, { useState, useEffect } from "react";
import { getDocuments, uploadDocument, deleteDocument, getClaims } from "@/lib/api";
import { DocumentRecord, Claim } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Select, Input } from "@/components/ui/inputs";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils/formatters";
import { useToast } from "@/lib/hooks/useToast";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  Trash2,
  Download,
  Eye,
  PlusCircle,
  FileSpreadsheet,
  Layers,
  FileCheck,
} from "lucide-react";

export default function DocumentsPage() {
  const { success, error, info } = useToast();
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [docType, setDocType] = useState<DocumentRecord["type"]>("SOF");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

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

    const handleStorage = () => fetchAll();
    window.addEventListener("demurrage_storage_change", handleStorage);
    return () => window.removeEventListener("demurrage_storage_change", handleStorage);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      info("Select File", "Please choose a file to upload.");
      return;
    }

    setIsUploading(true);
    try {
      const targetClaim = claims.find((c) => c.id === selectedClaimId);
      const newDoc = await uploadDocument(
        { name: selectedFile.name, size: selectedFile.size, type: selectedFile.type },
        selectedClaimId || "General",
        targetClaim ? targetClaim.claimName : "General Port File",
        docType
      );

      setDocuments((prev) => [newDoc, ...prev]);
      setSelectedFile(null);
      setIsUploading(false);
      success("Document Uploaded", `"${newDoc.fileName}" (${newDoc.type}) has been stored.`);
    } catch {
      setIsUploading(false);
      error("Upload Failed", "Could not upload document.");
    }
  };

  const handleDelete = async (id: string) => {
    await deleteDocument(id);
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    success("Document Deleted", "The document has been removed.");
  };

  const handleDownload = (doc: DocumentRecord) => {
    // Generate simple downloadable text file simulation
    const blob = new Blob([`Laytime Calculation System\nDocument: ${doc.fileName}\nType: ${doc.type}\nClaim: ${doc.claimId}\nUploaded: ${doc.uploadedAt}`], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    success("Download Started", `Downloading ${doc.fileName}`);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Voyage Documents
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Store, categorize, and inspect Statement of Facts, Charterparties, Timesheets, and Notices
          </p>
        </div>
      </div>

      {/* TOP SECTION: Upload Document matching Section 15 */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
            <UploadCloud className="h-4 w-4 text-blue-600" />
            <span>Upload Document</span>
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Upload supporting maritime documents for voyage files and claims
          </CardDescription>
        </CardHeader>

        <CardContent className="p-5">
          <form onSubmit={handleUpload} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-left">
            {/* File Selector */}
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="font-bold text-slate-700 block">Choose File</label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-slate-300 rounded-xl p-1 bg-slate-50/50"
                />
              </div>
            </div>

            {/* Document Type */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Document Type</label>
              <Select
                value={docType}
                onChange={(e) => setDocType(e.target.value as any)}
                className="h-9 text-xs bg-white"
              >
                <option value="SOF">SOF (Statement of Facts)</option>
                <option value="Charterparty">Charterparty</option>
                <option value="Timesheet">Timesheet</option>
                <option value="NOR">NOR (Notice of Readiness)</option>
                <option value="Notice">Notice</option>
                <option value="Other">Other supporting documents</option>
              </Select>
            </div>

            {/* Link to Claim */}
            <div className="space-y-1">
              <label className="font-bold text-slate-700 block">Link to Claim (Optional)</label>
              <Select
                value={selectedClaimId}
                onChange={(e) => setSelectedClaimId(e.target.value)}
                className="h-9 text-xs bg-white"
              >
                <option value="">General (No specific claim)</option>
                {claims.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.id} — {c.shipName}
                  </option>
                ))}
              </Select>
            </div>

            {/* Upload Button */}
            <div className="flex items-end">
              <Button
                type="submit"
                isLoading={isUploading}
                disabled={!selectedFile}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 rounded-xl flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <UploadCloud className="h-4 w-4" />
                <span>Upload</span>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* DOCUMENT TABLE matching Section 15 */}
      <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
        <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <FileText className="h-4 w-4 text-blue-600" />
              <span>Document Repository</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {documents.length} files attached across all voyage claims
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-5">
          {documents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Document Name</th>
                    <th className="py-3 px-4">Claim No.</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Uploaded On</th>
                    <th className="py-3 px-4">Version</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-50/80 transition">
                      {/* Document Name */}
                      <td className="py-3 px-4 font-semibold text-slate-900 flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-blue-600 shrink-0" />
                        <span className="truncate max-w-xs">{doc.fileName}</span>
                      </td>

                      {/* Claim No. */}
                      <td className="py-3 px-4 font-mono font-medium text-slate-600">
                        {doc.claimId !== "General" ? (
                          <Link href={`/claims/${doc.claimId}`} className="text-blue-600 hover:underline">
                            {doc.claimId}
                          </Link>
                        ) : (
                          <span className="text-slate-400">General</span>
                        )}
                      </td>

                      {/* Type */}
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[11px] font-semibold border border-blue-200">
                          {doc.type || "SOF"}
                        </span>
                      </td>

                      {/* Uploaded On */}
                      <td className="py-3 px-4 text-slate-500">
                        {formatDateTime(doc.uploadedAt)}
                      </td>

                      {/* Version */}
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {doc.version || "v1.0"}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => handleDownload(doc)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                            title="Download Document"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Delete Document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-8">
              <EmptyState
                icon={FileText}
                title="No documents uploaded"
                description="Upload Statement of Facts, Charterparties, NORs, or timesheets using the upload form above."
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
