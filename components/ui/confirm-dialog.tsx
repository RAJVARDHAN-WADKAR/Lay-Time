import React from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { AlertTriangle } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
  description?: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  variant?: "destructive" | "default";
  destructive?: boolean;
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  confirmLabel,
  confirmText,
  cancelLabel = "Cancel",
  cancelText,
  variant,
  destructive = false,
  isLoading = false,
}: ConfirmDialogProps) {
  const isDestructive = destructive || variant === "destructive";
  const bodyText = description || message || "Are you sure you want to proceed?";
  const confirmBtnLabel = confirmText || confirmLabel || "Confirm";
  const cancelBtnLabel = cancelText || cancelLabel || "Cancel";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} maxWidth="md">
      <div className="space-y-4 text-xs">
        <div className="flex items-start space-x-3">
          <div
            className={`p-2 rounded-full shrink-0 ${
              isDestructive ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
            }`}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="text-xs text-slate-600 leading-relaxed pt-0.5">{bodyText}</p>
        </div>
        <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isLoading} className="text-xs">
            {cancelBtnLabel}
          </Button>
          <Button
            size="sm"
            variant={isDestructive ? "destructive" : "default"}
            onClick={() => {
              onConfirm();
            }}
            isLoading={isLoading}
            className="text-xs font-semibold"
          >
            {confirmBtnLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
