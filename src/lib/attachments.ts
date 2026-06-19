import { createClient } from "@/lib/supabase/client";

export const ATTACHMENTS_BUCKET = "mycitymyduty-attachments";

export interface RecordAttachment {
  url: string;
  description: string;
  file_name: string;
  uploaded_at: string;
}

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

export function parseAttachments(value: unknown): RecordAttachment[] {
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parseAttachments(parsed);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
    .map((item) => ({
      url: String(item.url ?? ""),
      description: String(item.description ?? ""),
      file_name: String(item.file_name ?? ""),
      uploaded_at: String(item.uploaded_at ?? ""),
    }))
    .filter((item) => item.url);
}

export function serializeAttachments(items: RecordAttachment[]): string {
  return JSON.stringify(items);
}

export function isImageAttachment(item: RecordAttachment): boolean {
  const name = item.file_name.toLowerCase();
  return /\.(jpe?g|png|webp)$/i.test(name) || item.url.includes("/storage/v1/object/");
}

export function validateImageFile(file: File): string | null {
  if (!IMAGE_TYPES.has(file.type)) {
    return "Only JPG, PNG, and WebP images are allowed.";
  }
  if (file.size > 5 * 1024 * 1024) {
    return "Image must be 5 MB or smaller.";
  }
  return null;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function uploadCorporationLogo(
  file: File,
  corporationId: string
): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = createClient();
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeExt = ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : "png";
  const objectPath = `corporations/${corporationId}/logo.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(objectPath, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function uploadAttachmentFile(
  file: File,
  table: string,
  recordId?: string
): Promise<RecordAttachment> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = createClient();
  const folder = recordId ? `${table}/${recordId}` : `${table}/draft`;
  const objectPath = `${folder}/${crypto.randomUUID()}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(ATTACHMENTS_BUCKET)
    .upload(objectPath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(ATTACHMENTS_BUCKET).getPublicUrl(objectPath);

  return {
    url: data.publicUrl,
    description: "",
    file_name: file.name,
    uploaded_at: new Date().toISOString(),
  };
}
