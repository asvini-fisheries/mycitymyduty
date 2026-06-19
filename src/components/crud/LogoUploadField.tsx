"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { uploadCorporationLogo, validateImageFile } from "@/lib/attachments";
import { Button } from "@/components/ui/Button";

interface LogoUploadFieldProps {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  recordId?: string;
  onFileSelected?: (file: File | null) => void;
  accept?: string;
}

export function LogoUploadField({
  name,
  label,
  value,
  onChange,
  recordId,
  onFileSelected,
  accept = "image/jpeg,image/png,image/webp",
}: LogoUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFileSelect(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setPreviewUrl(URL.createObjectURL(file));
    onFileSelected?.(file);

    if (!recordId) {
      return;
    }

    setUploading(true);
    try {
      const url = await uploadCorporationLogo(file, recordId);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleRemove() {
    onChange("");
    onFileSelected?.(null);
    setPreviewUrl(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const displayUrl = previewUrl || value || null;

  return (
    <div className="space-y-3 sm:col-span-2">
      <div className="flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-civic-800">{label}</label>
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
          {uploading ? "Uploading..." : displayUrl ? "Replace logo" : "Upload logo"}
        </Button>
      </div>

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        className="hidden"
        onChange={(e) => handleFileSelect(e.target.files)}
      />

      {!recordId && (
        <p className="text-xs text-civic-500">
          Logo uploads immediately when editing. For new corporations, save first — a
          pending logo will upload on save.
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {displayUrl ? (
        <div className="flex items-start gap-4 rounded-lg border border-civic-100 bg-civic-50/40 p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt="Corporation logo preview"
            className="h-20 w-20 rounded-lg border border-civic-200 bg-white object-contain p-1"
          />
          <div className="flex flex-1 flex-col gap-2">
            <p className="text-sm text-civic-700">Corporation logo (JPG, PNG, or WebP, max 5 MB)</p>
            <Button type="button" variant="ghost" size="sm" onClick={handleRemove}>
              <Trash2 className="mr-2 h-4 w-4 text-red-600" />
              Remove logo
            </Button>
          </div>
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-civic-200 bg-civic-50/50 px-4 py-6 text-center text-sm text-civic-500">
          No logo uploaded. Use &quot;Upload logo&quot; to add your corporation brand mark.
        </p>
      )}
    </div>
  );
}
