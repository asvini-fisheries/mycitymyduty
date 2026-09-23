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

function safeImageExt(file: File, fallback: string): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || fallback;
  return ["jpg", "jpeg", "png", "webp"].includes(ext) ? ext : fallback;
}

export function storagePathFromPublicUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl);
    const marker = `/object/public/${ATTACHMENTS_BUCKET}/`;
    const idx = url.pathname.indexOf(marker);
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + marker.length));
  } catch {
    return null;
  }
}

export async function removeAttachmentByUrl(publicUrl: string): Promise<void> {
  const path = storagePathFromPublicUrl(publicUrl);
  if (!path) return;
  const supabase = createClient();
  await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
}

async function uploadUniqueImage(file: File, folder: string): Promise<string> {
  const validationError = validateImageFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const supabase = createClient();
  const objectPath = `${folder}/${crypto.randomUUID()}.${safeImageExt(file, "png")}`;

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
  const url = new URL(data.publicUrl);
  url.searchParams.set("v", Date.now().toString());
  return url.toString();
}

export async function uploadCorporationLogo(
  file: File,
  corporationId: string
): Promise<string> {
  return uploadUniqueImage(file, `corporations/${corporationId}/logo`);
}

export async function uploadCertificateTemplate(
  file: File,
  projectId: string
): Promise<string> {
  return uploadUniqueImage(file, `projects/${projectId}/certificate-template`);
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
