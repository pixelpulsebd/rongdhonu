import { createPrivateKey, createSign } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/drive";
const prefix = process.env.GOOGLE_DRIVE_FILE_PREFIX?.trim() || "rongdhonu-db-";
const folderId = required("GOOGLE_DRIVE_FOLDER_ID");
const keyPathSetting = process.env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim() || "credentials/google-service-account.json";
const keyPath = isAbsolute(keyPathSetting) ? keyPathSetting : resolve(process.cwd(), keyPathSetting);
const tables = ["admin_users", "business_profile", "services", "team_members", "work_items", "reviews", "hero_images", "contact_submissions", "user_reviews", "site_visitors", "site_visit_events"];

const token = await getAccessToken();
const files = await listFiles(token);
const byName = new Map();
for (const file of files) {
  if (!byName.has(file.name)) byName.set(file.name, []);
  byName.get(file.name).push(file);
}

let failures = 0;
for (const table of tables) {
  const name = `${prefix}${table}.json`;
  try {
    const found = byName.get(name) ?? [];
    if (found.length === 0) { console.error(`MISSING  ${name} (inside the configured folder)`); failures += 1; continue; }
    if (found.length > 1) console.warn(`WARNING  ${name}: ${found.length} files with this exact name exist in the folder; the first will be checked.`);
    const file = found[0];
    const response = await fetch(`${DRIVE_API}/files/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    const raw = await response.text();
    if (!response.ok) { console.error(`ERROR    ${name}: HTTP ${response.status} ${raw.slice(0, 200)}`); failures += 1; continue; }
    let doc;
    try { doc = JSON.parse(raw); } catch { console.error(`INVALID  ${name}: invalid JSON`); failures += 1; continue; }
    const rows = Array.isArray(doc) ? doc : doc?.rows;
    if (!Array.isArray(rows)) { console.error(`INVALID  ${name}: no rows array`); failures += 1; continue; }
    if (!Array.isArray(doc) && doc.table && doc.table !== table) { console.error(`INVALID  ${name}: document table is ${doc.table}`); failures += 1; continue; }
    console.log(`OK       ${name}: ${rows.length} rows`);
  } catch (error) {
    console.error(`ERROR    ${name}: ${error instanceof Error ? error.message : String(error)}`);
    failures += 1;
  }
}

if (failures) {
  console.error(`\nGoogle Drive data-store verification failed: ${failures} table(s) missing or invalid.`);
  process.exitCode = 1;
} else {
  console.log("\nAll 11 Google Drive table files were found in the configured folder and contain valid row arrays.");
}

async function getAccessToken() {
  const credentials = readServiceAccountCredentials();
  const privateKeyText = normalizePrivateKey(credentials.private_key);
  let privateKey;
  try { privateKey = createPrivateKey({ key: privateKeyText, format: "pem" }); }
  catch { throw new Error("Google service-account private key could not be parsed. Check the complete PEM key and newline formatting."); }
  const now = Math.floor(Date.now() / 1000);
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: credentials.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 })}`;
  const signer = createSign("RSA-SHA256"); signer.update(unsigned); signer.end();
  const assertion = `${unsigned}.${signer.sign(privateKey, "base64url")}`;
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) throw new Error(`Google service-account token exchange failed (${response.status}): ${body.error_description || body.error || "No access token returned."}`);
  return body.access_token;
}

function readServiceAccountCredentials() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() || process.env.GOOGLE_CLIENT_EMAIL?.trim() || "";
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.trim() || "";
  if (email || privateKey) {
    if (!email || !privateKey) throw new Error("Set both GOOGLE_SERVICE_ACCOUNT_EMAIL (or GOOGLE_CLIENT_EMAIL) and GOOGLE_PRIVATE_KEY in .env.");
    return { type: "service_account", client_email: email, private_key: privateKey };
  }
  let raw;
  try { raw = readFileSync(keyPath, "utf8").replace(/^\uFEFF/, ""); }
  catch { throw new Error(`Google service-account credentials not found in environment variables or at '${keyPath}'. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY, or configure GOOGLE_SERVICE_ACCOUNT_FILE.`); }
  let credentials;
  try { credentials = JSON.parse(raw); }
  catch { throw new Error(`The file at '${keyPath}' is not valid JSON.`); }
  if (credentials?.type !== "service_account" || typeof credentials.client_email !== "string" || typeof credentials.private_key !== "string") {
    throw new Error("Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY, or point GOOGLE_SERVICE_ACCOUNT_FILE to a service-account key JSON. OAuth client JSON is not supported.");
  }
  return credentials;
}

function normalizePrivateKey(raw) {
  let value = String(raw ?? "").trim().replace(/^\uFEFF/, "");
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\r\n?/g, "\n").trim() + "\n";
}

async function listFiles(accessToken) {
  const escapedFolder = folderId.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
  const found = [];
  let pageToken;
  do {
    const params = new URLSearchParams({
      q: `'${escapedFolder}' in parents and trashed = false`,
      pageSize: "1000",
      fields: "nextPageToken,files(id,name,mimeType,modifiedTime)",
      spaces: "drive",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    if (pageToken) params.set("pageToken", pageToken);
    const response = await fetch(`${DRIVE_API}/files?${params}`, { headers: { Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`Google Drive list failed (${response.status}): ${JSON.stringify(body).slice(0, 400)}`);
    found.push(...(body.files ?? []));
    pageToken = body.nextPageToken;
  } while (pageToken);
  return found;
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required; see .env.example`);
  return value;
}
