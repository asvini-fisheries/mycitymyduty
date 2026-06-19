"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { isImageAttachment, type RecordAttachment } from "@/lib/attachments";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

interface AttachmentViewerModalProps {
  open: boolean;
  onClose: () => void;
  attachments: RecordAttachment[];
  recordTitle?: string;
}

export function AttachmentViewerModal({
  open,
  onClose,
  attachments,
  recordTitle,
}: AttachmentViewerModalProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!open) {
      setPreviewIndex(null);
    }
  }, [open]);

  const modalTitle = recordTitle ? `Attachments — ${recordTitle}` : "Attachments";
  const previewItem = previewIndex !== null ? attachments[previewIndex] : null;

  function showPrevious() {
    if (previewIndex === null || attachments.length <= 1) return;
    setPreviewIndex((previewIndex - 1 + attachments.length) % attachments.length);
  }

  function showNext() {
    if (previewIndex === null || attachments.length <= 1) return;
    setPreviewIndex((previewIndex + 1) % attachments.length);
  }

  return (
    <>
      <Modal open={open} title={modalTitle} onClose={onClose}>
        {attachments.length === 0 ? (
          <p className="rounded-lg border border-dashed border-civic-200 bg-civic-50/50 px-4 py-8 text-center text-sm text-civic-500">
            No images attached to this record.
          </p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {attachments.map((item, index) => (
              <li
                key={`${item.url}-${index}`}
                className="overflow-hidden rounded-lg border border-civic-100 bg-civic-50/40"
              >
                {isImageAttachment(item) ? (
                  <button
                    type="button"
                    onClick={() => setPreviewIndex(index)}
                    className="block w-full overflow-hidden bg-white transition hover:opacity-90"
                    aria-label={`View ${item.file_name || "attachment"} full size`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.description || item.file_name || "Attachment"}
                      className="aspect-[4/3] w-full object-cover"
                    />
                  </button>
                ) : (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex aspect-[4/3] w-full items-center justify-center bg-white text-sm text-civic-600 hover:bg-civic-50"
                  >
                    {item.file_name || "Open file"}
                  </a>
                )}
                <div className="space-y-1 p-3">
                  {item.file_name && (
                    <p className="truncate text-sm font-medium text-civic-800">
                      {item.file_name}
                    </p>
                  )}
                  <p className="text-sm text-civic-600">
                    {item.description.trim() || "No description provided."}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      {previewItem && previewIndex !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Image preview"
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label="Close preview"
            onClick={() => setPreviewIndex(null)}
          />

          {attachments.length > 1 && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute left-4 top-1/2 z-10 -translate-y-1/2 bg-black/40 text-white hover:bg-black/60"
                onClick={showPrevious}
                aria-label="Previous image"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-4 top-1/2 z-10 -translate-y-1/2 bg-black/40 text-white hover:bg-black/60"
                onClick={showNext}
                aria-label="Next image"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </>
          )}

          <div className="relative z-10 flex max-h-[90vh] max-w-5xl flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewItem.url}
              alt={previewItem.description || previewItem.file_name || "Attachment"}
              className="max-h-[75vh] max-w-full rounded-lg object-contain"
            />
            {(previewItem.description || previewItem.file_name) && (
              <div className="max-w-full rounded-lg bg-black/50 px-4 py-2 text-center text-sm text-white">
                {previewItem.file_name && (
                  <p className="font-medium">{previewItem.file_name}</p>
                )}
                {previewItem.description && (
                  <p className="text-white/90">{previewItem.description}</p>
                )}
              </div>
            )}
            {attachments.length > 1 && (
              <p className="text-xs text-white/70">
                {previewIndex + 1} of {attachments.length}
              </p>
            )}
          </div>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-4 top-4 z-10 bg-black/40 text-white hover:bg-black/60"
            onClick={() => setPreviewIndex(null)}
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
