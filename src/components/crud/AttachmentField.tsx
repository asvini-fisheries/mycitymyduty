"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import {
  isImageAttachment,
  parseAttachments,
  type RecordAttachment,
  uploadAttachmentFile,
} from "@/lib/attachments";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";

interface AttachmentFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  table: string;
  recordId?: string;
  multiple?: boolean;
  accept?: string;
  required?: boolean;
}

export function AttachmentField({
  name,
  label,
  value,
  onChange,
  table,
  recordId,
  multiple = true,
  accept = "image/jpeg,image/png,image/webp",
  required,
}: AttachmentFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const attachments = parseAttachments(value);

  function updateAttachments(next: RecordAttachment[]) {
    onChange(JSON.stringify(next));
  }

  async function handleFileSelect(files: FileList | null) {
    if (!files?.length) return;

    const fileList = multiple ? Array.from(files) : [files[0]];
    setUploading(true);
    setError(null);

    try {
      const uploaded: RecordAttachment[] = [];
      for (const file of fileList) {
        const item = await uploadAttachmentFile(file, table, recordId);
        uploaded.push(item);
      }
      updateAttachments(multiple ? [...attachments, ...uploaded] : uploaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleDescriptionChange(index: number, description: string) {
    const next = attachments.map((item, i) =>
      i === index ? { ...item, description } : item
    );
    updateAttachments(next);
  }

  function handleRemove(index: number) {
    updateAttachments(attachments.filter((_, i) => i !== index));
  }

  const canAddMore = multiple || attachments.length === 0;

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-civic-800">
          {label}
          {required && <span className="text-red-500"> *</span>}
        </label>
        {canAddMore && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 h-4 w-4" />
            )}
            {uploading ? "Uploading..." : "Add image"}
          </Button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {attachments.length === 0 ? (
        <p className="rounded-lg border border-dashed border-civic-200 bg-civic-50/50 px-4 py-6 text-center text-sm text-civic-500">
          No images attached. Use &quot;Add image&quot; to upload JPG, PNG, or WebP files with a description.
        </p>
      ) : (
        <ul className="space-y-3">
          {attachments.map((item, index) => (
            <li
              key={`${item.url}-${index}`}
              className="flex flex-col gap-3 rounded-lg border border-civic-100 bg-civic-50/40 p-3 sm:flex-row"
            >
              <div className="flex shrink-0 items-start gap-3">
                {isImageAttachment(item) ? (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block overflow-hidden rounded-md border border-civic-200 bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.description || item.file_name || "Attachment"}
                      className="h-24 w-24 object-cover"
                    />
                  </a>
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-md border border-civic-200 bg-white text-xs text-civic-500">
                    File
                  </div>
                )}
                <div className="min-w-0 sm:hidden">
                  <p className="truncate text-sm font-medium text-civic-800">
                    {item.file_name || "Attachment"}
                  </p>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-2">
                <p className="hidden truncate text-sm font-medium text-civic-800 sm:block">
                  {item.file_name || "Attachment"}
                </p>
                <Textarea
                  label="Description"
                  name={`${name}_description_${index}`}
                  placeholder="Describe this image (e.g. site photo, bill scan, progress evidence)"
                  value={item.description}
                  onChange={(e) => handleDescriptionChange(index, e.target.value)}
                  rows={2}
                />
              </div>

              <div className="flex shrink-0 justify-end sm:items-start">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemove(index)}
                  aria-label="Remove attachment"
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
