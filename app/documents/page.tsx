"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { getDocuments, uploadDocument, deleteDocument, getClaims } from "@/lib/api";
import { DocumentRecord, Claim, DocumentType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataErrorBanner } from "@/components/ui/data-error-banner";
import { Select, Input } from "@/components/ui/inputs";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/utils/formatters";
import { useToast } from "@/lib/hooks/useToast";
import { useAuth } from "@/lib/context/AuthContext";
import { normalizeRole } from "@/lib/auth/accessMatrix";
import {
  UPLOAD_LIMIT_LABEL,
  formatHumanFileSize,
  validateUploadFileClient
} from "@/lib/uploads/constants";
import { Modal } from "@/components/ui/modal";
import Link from "next/link";
import {
  UploadCloud,
  FileText,
  Trash2,
  Download,
  Eye,
  FileSpreadsheet,
  Layers,
  FileCheck,
  LayoutGrid,
  List,
  RefreshCw,
  FolderOpen,
  History,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileUp,
} from "lucide-react";

function DocumentsContent() {
  const searchParams = useSearchParams();
  const urlClaimId = searchParams.get("claimId") || "";

  const { role, currentUser, canUploadDocuments, canDeleteDocuments } = useAuth();
  const normRole = normalizeRole(role, Boolean(currentUser?.clientId || (currentUser as any)?.client_id));
  const { success, error, info } = useToast();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState(urlClaimId);
  const [docType, setDocType] = useState<DocumentType>("SOF");
  const [customTitle, setCustomTitle] = useState("");
  const [tags, setTags] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadValidationError, setUploadValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isDragOver, setIsDragOver] = useState(false);

  // Document Preview Modal
  const [previewDoc, setPreviewDoc] = useState<DocumentRecord | null>(null);

  // Replace Document Modal
  const [replaceTarget, setReplaceTarget] = useState<DocumentRecord | null>(null);
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [isReplacing, setIsReplacing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const fetchAll = useCallback(async (isManualRefresh = false) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [docs, cls] = await Promise.all([getDocuments(), getClaims()]);
      setDocuments(docs);
      setClaims(cls);
      if (urlClaimId) {
        setSelectedClaimId(urlClaimId);
      } else if (cls.length > 0 && !selectedClaimId) {
        setSelectedClaimId(cls[0].id);
      }
      if (isManualRefresh) {
        success("Documents Refreshed", `Loaded ${docs.length} documents from repository.`);
      }
    } catch (e: any) {
      const msg = e.message || "Could not load documents";
      setLoadError(msg);
      error("Fetch Error", msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClaimId, urlClaimId, error, success]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const validateFile = (file: File): { valid: boolean; error?: string } => {
    return validateUploadFileClient(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const check = validateFile(file);
      if (!check.valid) {
        const msg = check.error || "File not allowed";
        setUploadValidationError(msg);
        setSelectedFile(null);
        error("Invalid File", msg);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }
      setUploadValidationError(null);
      setSelectedFile(file);
      if (!customTitle) {
        setCustomTitle(file.name);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const check = validateFile(file);
      if (!check.valid) {
        const msg = check.error || "File not allowed";
        setUploadValidationError(msg);
        setSelectedFile(null);
        error("Invalid File", msg);
        return;
      }
      setUploadValidationError(null);
      setSelectedFile(file);
      if (!customTitle) {
        setCustomTitle(file.name);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      info("Select File", "Please choose a file to upload.");
      return;
    }

    const clientCheck = validateFile(selectedFile);
    if (!clientCheck.valid) {
      const msg = clientCheck.error || "Invalid file.";
      setUploadValidationError(msg);
      error("Invalid File", msg);
      return;
    }

    setIsUploading(true);
    setUploadProgress(5);
    setUploadValidationError(null);
    try {
      const targetClaim = claims.find((c) => c.id === selectedClaimId);
      const fileNameToUse = (customTitle.trim() || selectedFile.name).trim();

      const newDoc = await uploadDocument({
        file: selectedFile,
        claimId: selectedClaimId && selectedClaimId !== "General" ? selectedClaimId : undefined,
        claimName: targetClaim ? targetClaim.claimName : undefined,
        category: docType,
        title: fileNameToUse,
        onProgress: (pct) => setUploadProgress(pct)
      });

      setDocuments((prev) => {
        const idx = prev.findIndex((d) => d.id === newDoc.id);
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = newDoc;
          return updated;
        }
        return [newDoc, ...prev];
      });

      setSelectedFile(null);
      setCustomTitle("");
      setTags("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      success("Document Uploaded", `"${newDoc.fileName}" (${newDoc.version || "v1.0"}) saved.`);
    } catch (err: any) {
      const msg = err.message || "Could not upload document.";
      setUploadValidationError(msg);
      error("Upload Failed", msg);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleReplaceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replaceTarget || !replaceFile) {
      info("Select File", "Please choose a replacement file.");
      return;
    }

    setIsReplacing(true);
    try {
      const targetClaim = claims.find((c) => c.id === replaceTarget.claimId);
      const updatedDoc = await uploadDocument({
        file: replaceFile,
        claimId: replaceTarget.claimId,
        claimName: targetClaim ? targetClaim.claimName : replaceTarget.claimName,
        category: replaceTarget.category || replaceTarget.type || "SOF",
        title: replaceTarget.fileName
      });

      setDocuments((prev) => {
        const idx = prev.findIndex((d) => d.id === updatedDoc.id);
        if (idx >= 0) {
          const arr = [...prev];
          arr[idx] = updatedDoc;
          return arr;
        }
        return [updatedDoc, ...prev];
      });

      setReplaceTarget(null);
      setReplaceFile(null);
      if (replaceInputRef.current) replaceInputRef.current.value = "";
      success("Version Updated", `Uploaded new version (${updatedDoc.version}) of "${updatedDoc.fileName}".`);
    } catch (err: any) {
      error("Replace Failed", err.message || "Failed to replace document.");
    } finally {
      setIsReplacing(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument(id);
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      success("Document Deleted", "The document has been removed.");
    } catch (err: any) {
      error("Delete Failed", err.message || "Failed to delete document.");
    }
  };

  const handleDownload = (doc: DocumentRecord) => {
    const a = document.createElement("a");
    a.href = `/api/documents/${doc.id}/download`;
    a.download = doc.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    success("Download Started", `Downloading ${doc.fileName}`);
  };

  const formatFileSize = (bytes?: number) => {
    return formatHumanFileSize(bytes || 0);
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
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
              {documents.length} Files
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Store, categorize, and inspect Statement of Facts, Charterparties, Timesheets, and Notices
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center space-x-2">
          <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-50">
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                viewMode === "list"
                  ? "bg-white text-blue-600 shadow-2xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="List View"
            >
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">List</span>
            </button>
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1 transition ${
                viewMode === "grid"
                  ? "bg-white text-blue-600 shadow-2xs border border-slate-200"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Grid</span>
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => fetchAll(true)}
            className="h-9 px-3 text-xs text-slate-600 hover:text-slate-900"
            title="Refresh repository"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loadError && (
        <DataErrorBanner
          title="Unable to load documents"
          message={loadError}
          onRetry={() => fetchAll(true)}
          isRetrying={isLoading}
        />
      )}

      {/* UPLOAD DOCUMENT ZONE (Only if user can upload documents) */}
      {canUploadDocuments() && (
        <Card className="border-slate-200 shadow-2xs bg-white rounded-2xl overflow-hidden">
          <CardHeader className="p-5 pb-3 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center space-x-2">
              <UploadCloud className="h-4 w-4 text-blue-600" />
              <span>Upload Document</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {UPLOAD_LIMIT_LABEL}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            <form onSubmit={handleUpload} className="space-y-4">
              {/* Drag and Drop Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer ${
                  isDragOver
                    ? "border-blue-500 bg-blue-50/50"
                    : selectedFile
                    ? "border-emerald-400 bg-emerald-50/30"
                    : "border-slate-300 hover:border-blue-400 bg-slate-50/50"
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".pdf,.png,.jpg,.jpeg,.csv,.tsv"
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-2.5">
                  <div className="p-3 bg-white rounded-full border border-slate-200 shadow-2xs">
                    {selectedFile ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                    ) : (
                      <FileUp className="h-6 w-6 text-blue-600" />
                    )}
                  </div>
                  <div>
                    {selectedFile ? (
                      <div>
                        <p className="text-xs font-bold text-slate-900">{selectedFile.name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatFileSize(selectedFile.size)} • Ready to upload
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Drag and drop your file here
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {UPLOAD_LIMIT_LABEL}
                        </p>
                      </div>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="h-8 px-4 text-xs font-semibold bg-white border-slate-300 hover:bg-slate-100 rounded-xl"
                  >
                    Browse files
                  </Button>
                </div>
              </div>

              {uploadValidationError && (
                <div
                  role="alert"
                  className="flex items-center space-x-2 text-xs text-rose-800 bg-rose-50 border border-rose-200 px-3.5 py-2.5 rounded-xl"
                >
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
                  <span className="font-semibold">{uploadValidationError}</span>
                </div>
              )}

              {isUploading && (
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                    <span>Uploading file...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 transition-all duration-150"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Metadata Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-left">
                {/* Title / Document Name */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Document Title / File Name</label>
                  <Input
                    type="text"
                    placeholder="e.g. Statement of Facts Port Talbot.pdf"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>

                {/* Document Type */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Category</label>
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
                    <option value="Pumping Log">Pumping Log</option>
                    <option value="Ullage Report">Ullage Report</option>
                    <option value="Bill of Lading">Bill of Lading</option>
                    <option value="Other">Other supporting documents</option>
                  </Select>
                </div>

                {/* Link to Claim */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">
                    {normRole === "CLAIM_PROCESSOR" ? "Assigned Claim (Required)" : "Link to Claim (Optional)"}
                  </label>
                  <Select
                    value={selectedClaimId}
                    onChange={(e) => setSelectedClaimId(e.target.value)}
                    className="h-9 text-xs bg-white"
                  >
                    {normRole !== "CLAIM_PROCESSOR" && (
                      <option value="">General (No specific claim)</option>
                    )}
                    {claims.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} — {c.shipName}
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Tags */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-700 block">Tags / Reference</label>
                  <Input
                    type="text"
                    placeholder="e.g. Final, Signed, Disputed"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="h-9 text-xs bg-white"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  isLoading={isUploading}
                  disabled={!selectedFile}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-6 rounded-xl flex items-center space-x-1.5 shadow-xs"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Upload Document</span>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* DOCUMENT REPOSITORY */}
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
            viewMode === "list" ? (
              /* LIST VIEW */
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border border-slate-200 rounded-xl overflow-hidden">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-3 px-4">Document Name</th>
                      <th className="py-3 px-4">Claim No.</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Size</th>
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
                          {doc.claimId && doc.claimId !== "General" ? (
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
                            {doc.category || doc.type || "SOF"}
                          </span>
                        </td>

                        {/* Size */}
                        <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                          {formatFileSize(doc.fileSize)}
                        </td>

                        {/* Uploaded On */}
                        <td className="py-3 px-4 text-slate-500">
                          {formatDateTime(doc.uploadedAt)}
                        </td>

                        {/* Version */}
                        <td className="py-3 px-4 font-mono text-slate-600">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-[10px]">
                            {doc.version || "v1.0"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center space-x-1.5">
                            <button
                              onClick={() => setPreviewDoc(doc)}
                              className="p-1 text-slate-400 hover:text-blue-600 transition"
                              title="Preview Document Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-1 text-slate-400 hover:text-emerald-600 transition"
                              title="Download Document"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            {canUploadDocuments() && (
                              <button
                                onClick={() => {
                                  setReplaceTarget(doc);
                                  setReplaceFile(null);
                                }}
                                className="p-1 text-slate-400 hover:text-amber-600 transition"
                                title="Upload New Version"
                              >
                                <History className="h-4 w-4" />
                              </button>
                            )}
                            {canDeleteDocuments && (
                              <button
                                onClick={() => handleDelete(doc.id)}
                                className="p-1 text-slate-400 hover:text-rose-600 transition"
                                title="Delete Document"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-blue-600">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="overflow-hidden">
                          <h4 className="font-bold text-slate-900 text-xs truncate max-w-[170px]" title={doc.fileName}>
                            {doc.fileName}
                          </h4>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {formatFileSize(doc.fileSize)}
                          </span>
                        </div>
                      </div>

                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-bold text-[10px]">
                        {doc.version || "v1.0"}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div>
                        {doc.claimId && doc.claimId !== "General" ? (
                          <Link href={`/claims/${doc.claimId}`} className="text-blue-600 hover:underline font-mono">
                            {doc.claimId}
                          </Link>
                        ) : (
                          <span>General File</span>
                        )}
                      </div>
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                        {doc.category || doc.type || "SOF"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px] text-slate-400">
                      <span>{formatDateTime(doc.uploadedAt)}</span>

                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1 hover:text-blue-600 text-slate-400"
                          title="Preview"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="p-1 hover:text-emerald-600 text-slate-400"
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {canUploadDocuments() && (
                          <button
                            onClick={() => {
                              setReplaceTarget(doc);
                              setReplaceFile(null);
                            }}
                            className="p-1 hover:text-amber-600 text-slate-400"
                            title="New Version"
                          >
                            <History className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {canDeleteDocuments && (
                          <button
                            onClick={() => handleDelete(doc.id)}
                            className="p-1 hover:text-rose-600 text-slate-400"
                            title="Delete"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
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

      {/* PREVIEW MODAL */}
      {previewDoc && (
        <Modal
          isOpen={Boolean(previewDoc)}
          onClose={() => setPreviewDoc(null)}
          title="Document Details & Revision History"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-sm">{previewDoc.fileName}</h3>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold text-[10px]">
                  {previewDoc.version || "v1.0"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-600 text-[11px] pt-2 border-t border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Category</span>
                  <span className="font-semibold text-slate-800">{previewDoc.category || previewDoc.type || "SOF"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Associated Claim</span>
                  <span className="font-mono font-semibold text-slate-800">{previewDoc.claimId || "General"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">File Size</span>
                  <span className="font-semibold text-slate-800">{formatFileSize(previewDoc.fileSize)}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Upload Date</span>
                  <span className="font-semibold text-slate-800">{formatDateTime(previewDoc.uploadedAt)}</span>
                </div>
              </div>
            </div>

            {/* Revisions History */}
            <div>
              <h4 className="font-bold text-slate-800 mb-2 flex items-center space-x-1">
                <History className="h-3.5 w-3.5 text-blue-600" />
                <span>Version History</span>
              </h4>

              {previewDoc.revisions && previewDoc.revisions.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {previewDoc.revisions.map((rev) => (
                    <div key={rev.id} className="p-3 bg-white flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-slate-900 text-[11px]">{rev.version}</span>
                          <span className="text-slate-400 text-[10px]">by {rev.uploadedBy}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5">{rev.changeSummary || "Revision record"}</p>
                      </div>
                      <span className="text-slate-400 text-[10px]">{formatDateTime(rev.uploadedAt)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-center text-[11px]">
                  Current version: {previewDoc.version || "v1.0"} (Initial upload)
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(previewDoc)}
                className="text-xs"
              >
                <Download className="h-3.5 w-3.5 mr-1 text-emerald-600" />
                Download
              </Button>
              <Button
                size="sm"
                onClick={() => setPreviewDoc(null)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* REPLACE DOCUMENT MODAL */}
      {replaceTarget && (
        <Modal
          isOpen={Boolean(replaceTarget)}
          onClose={() => {
            setReplaceTarget(null);
            setReplaceFile(null);
          }}
          title={`Upload New Version of "${replaceTarget.fileName}"`}
        >
          <form onSubmit={handleReplaceSubmit} className="space-y-4 text-xs">
            <p className="text-slate-500">
              Uploading a replacement file will automatically increment the version (e.g. {replaceTarget.version || "v1.0"} → v1.1) and record a revision entry in the audit history.
            </p>

            <div
              onClick={() => replaceInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl p-5 text-center cursor-pointer bg-slate-50"
            >
              <input
                type="file"
                ref={replaceInputRef}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    const check = validateFile(f);
                    if (!check.valid) {
                      error("Invalid File", check.error || "File not allowed");
                      return;
                    }
                    setReplaceFile(f);
                  }
                }}
                accept=".pdf,.png,.jpg,.jpeg,.csv,.tsv"
                className="hidden"
              />
              <FileUp className="h-6 w-6 text-blue-600 mx-auto mb-1.5" />
              {replaceFile ? (
                <div>
                  <p className="font-bold text-slate-800">{replaceFile.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{formatFileSize(replaceFile.size)}</p>
                </div>
              ) : (
                <div>
                  <p className="font-bold text-slate-700">Click to select new file version</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{UPLOAD_LIMIT_LABEL}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setReplaceTarget(null);
                  setReplaceFile(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={!replaceFile}
                isLoading={isReplacing}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Upload Revision
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-500">Loading documents...</div>}>
      <DocumentsContent />
    </Suspense>
  );
}
