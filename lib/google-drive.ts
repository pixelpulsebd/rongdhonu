import "server-only";
import { createGoogleServiceAccountAssertion, getGoogleServiceAccountConfigurationError, getGoogleServiceAccountEmail, hasGoogleServiceAccountCredentials } from "@/lib/google-service-account";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
export const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType?: string;
  modifiedTime?: string;
  version?: string;
  webViewLink?: string;
}

type TokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};
type ListResponse = { files?: GoogleDriveFile[]; nextPageToken?: string };
type TokenCache = { value: string; expiresAt: number };

declare global {
  // eslint-disable-next-line no-var
  var __rongDhonuDriveToken: TokenCache | undefined;
  // eslint-disable-next-line no-var
  var __rongDhonuDriveTokenPending: Promise<string> | undefined;
  // eslint-disable-next-line no-var
  var __rongDhonuDriveFileIds: Map<string, string> | undefined;
}

const env = (name: string): string => process.env[name]?.trim() ?? "";

function driveFolderId(): string {
  const folderId = env("GOOGLE_DRIVE_FOLDER_ID");
  if (!folderId) {
    throw new Error("GOOGLE_DRIVE_FOLDER_ID is required. Put your table JSON files in one Google Drive folder and share that folder with the service-account email as Editor.");
  }
  return folderId;
}

export function isGoogleDriveConfigured(): boolean {
  return hasGoogleServiceAccountCredentials() && Boolean(env("GOOGLE_DRIVE_FOLDER_ID"));
}

export function getGoogleDriveConfigStatus() {
  return {
    configured: isGoogleDriveConfigured(),
    authMode: "service-account-key-file" as const,
    serviceAccountFile: env("GOOGLE_SERVICE_ACCOUNT_FILE") || "credentials/google-service-account.json",
    serviceAccountEmail: getGoogleServiceAccountEmail(),
    serviceAccountError: getGoogleServiceAccountConfigurationError(),
    hasDriveFolderId: Boolean(env("GOOGLE_DRIVE_FOLDER_ID")),
    filePrefix: env("GOOGLE_DRIVE_FILE_PREFIX") || "rongdhonu-db-",
  };
}

async function getAccessToken(): Promise<string> {
  const now = Date.now();
  if (globalThis.__rongDhonuDriveToken && globalThis.__rongDhonuDriveToken.expiresAt > now + 60_000) {
    return globalThis.__rongDhonuDriveToken.value;
  }
  if (globalThis.__rongDhonuDriveTokenPending) return globalThis.__rongDhonuDriveTokenPending;

  const assertion = createGoogleServiceAccountAssertion(GOOGLE_DRIVE_SCOPE);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });
  const pending = fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  })
    .then(async (response) => {
      const raw = await response.text();
      let data: TokenResponse = {};
      try { data = raw ? JSON.parse(raw) as TokenResponse : {}; } catch { /* use status below */ }
      if (!response.ok || !data.access_token) {
        throw new Error(`Google service-account token exchange failed (${response.status}): ${data.error_description || data.error || raw.slice(0, 300) || "No access token returned."}`);
      }
      globalThis.__rongDhonuDriveToken = {
        value: data.access_token,
        expiresAt: Date.now() + Math.max(60, Number(data.expires_in ?? 3600)) * 1000,
      };
      return data.access_token;
    })
    .finally(() => {
      globalThis.__rongDhonuDriveTokenPending = undefined;
    });
  globalThis.__rongDhonuDriveTokenPending = pending;
  return pending;
}

async function api<T>(url: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
    cache: "no-store",
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Google Drive API request failed (${response.status}): ${raw.slice(0, 500)}`);
  if (!raw) return undefined as T;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as T;
  }
}

function escapeQuery(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function listGoogleDriveFiles(name?: string): Promise<GoogleDriveFile[]> {
  const folderId = driveFolderId();
  const conditions = ["trashed = false", `'${escapeQuery(folderId)}' in parents`];
  if (name) conditions.push(`name = '${escapeQuery(name)}'`);
  const files: GoogleDriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: conditions.join(" and "),
      pageSize: "1000",
      orderBy: "name",
      fields: "files(id,name,mimeType,modifiedTime,version,webViewLink),nextPageToken",
      spaces: "drive",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const result = await api<ListResponse>(`${DRIVE_API}/files?${params}`);
    files.push(...(result.files ?? []));
    pageToken = result.nextPageToken;
  } while (pageToken);
  return files;
}

export async function readGoogleDriveFile(fileId: string): Promise<string> {
  if (!fileId.trim()) throw new Error("A Google Drive file ID is required.");
  const token = await getAccessToken();
  const params = new URLSearchParams({ alt: "media", supportsAllDrives: "true" });
  const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Google Drive file read failed (${response.status}): ${raw.slice(0, 500)}`);
  return raw;
}

export async function readGoogleDriveJson<T>(fileId: string): Promise<T> {
  try {
    return JSON.parse(await readGoogleDriveFile(fileId)) as T;
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error(`Google Drive file ${fileId} does not contain valid JSON.`);
    throw error;
  }
}

export async function readGoogleDriveJsonDocument<T>(name: string): Promise<{ file: GoogleDriveFile; value: T } | null> {
  const cached = globalThis.__rongDhonuDriveFileIds?.get(name);
  if (cached) {
    try {
      return { file: { id: cached, name }, value: await readGoogleDriveJson<T>(cached) };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/\b(404|not found)\b/i.test(message)) throw error;
      globalThis.__rongDhonuDriveFileIds?.delete(name);
    }
  }
  const file = (await listGoogleDriveFiles(name))[0];
  if (!file) return null;
  if (!globalThis.__rongDhonuDriveFileIds) globalThis.__rongDhonuDriveFileIds = new Map<string, string>();
  globalThis.__rongDhonuDriveFileIds.set(name, file.id);
  return { file, value: await readGoogleDriveJson<T>(file.id) };
}

async function resumableJsonUpload(options: { name?: string; fileId?: string; value: unknown }): Promise<GoogleDriveFile> {
  const token = await getAccessToken();
  const content = JSON.stringify(options.value, null, 2);
  const bytes = new TextEncoder().encode(content);
  const isUpdate = Boolean(options.fileId);
  const supportsAllDrives = "supportsAllDrives=true";
  const endpoint = isUpdate
    ? `${DRIVE_UPLOAD_API}/files/${encodeURIComponent(options.fileId!)}?uploadType=resumable&fields=id,name,mimeType,modifiedTime,version,webViewLink&${supportsAllDrives}`
    : `${DRIVE_UPLOAD_API}/files?uploadType=resumable&fields=id,name,mimeType,modifiedTime,version,webViewLink&${supportsAllDrives}`;
  const metadata = isUpdate
    ? { mimeType: "application/json" }
    : { name: options.name, mimeType: "application/json", parents: [driveFolderId()] };
  const start = await fetch(endpoint, {
    method: isUpdate ? "PATCH" : "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "application/json",
      "X-Upload-Content-Length": String(bytes.byteLength),
    },
    body: JSON.stringify(metadata),
    cache: "no-store",
  });
  if (!start.ok) {
    const details = (await start.text()).slice(0, 500);
    throw new Error(`Google Drive upload session failed (${start.status}): ${details}`);
  }
  const sessionUrl = start.headers.get("Location");
  if (!sessionUrl) throw new Error("Google Drive did not return a resumable upload session URL.");
  const uploaded = await fetch(sessionUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8",
      "Content-Length": String(bytes.byteLength),
    },
    body: bytes,
    cache: "no-store",
  });
  const raw = await uploaded.text();
  if (!uploaded.ok) throw new Error(`Google Drive JSON upload failed (${uploaded.status}): ${raw.slice(0, 500)}`);
  let file: GoogleDriveFile;
  try {
    file = JSON.parse(raw) as GoogleDriveFile;
  } catch {
    throw new Error("Google Drive accepted the upload but returned invalid file metadata.");
  }
  if (!globalThis.__rongDhonuDriveFileIds) globalThis.__rongDhonuDriveFileIds = new Map<string, string>();
  const name = options.name ?? file.name;
  if (name) globalThis.__rongDhonuDriveFileIds.set(name, file.id);
  return file;
}

export async function createGoogleDriveJsonFile(name: string, value: unknown): Promise<GoogleDriveFile> {
  if (!name.trim()) throw new Error("A Google Drive file name is required.");
  return resumableJsonUpload({ name, value });
}

export async function updateGoogleDriveJsonFile(fileId: string, value: unknown): Promise<GoogleDriveFile> {
  if (!fileId.trim()) throw new Error("A Google Drive file ID is required.");
  return resumableJsonUpload({ fileId, value });
}

export async function upsertGoogleDriveJsonDocument(name: string, value: unknown): Promise<GoogleDriveFile> {
  const existing = await readGoogleDriveJsonDocument<unknown>(name);
  if (existing) return updateGoogleDriveJsonFile(existing.file.id, value);
  return createGoogleDriveJsonFile(name, value);
}

export async function deleteGoogleDriveFile(fileId: string): Promise<void> {
  if (!fileId.trim()) throw new Error("A Google Drive file ID is required.");
  await api<undefined>(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`, { method: "DELETE" });
}
