import { createPrivateKey, createSign, type KeyObject } from "node:crypto";
import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";

type ServiceAccountJson = {
  type?: unknown;
  client_email?: unknown;
  private_key?: unknown;
  project_id?: unknown;
};

type Credentials = { email: string; privateKey: KeyObject; projectId?: string };

function credentialFilePath(): string {
  const configured = process.env.GOOGLE_SERVICE_ACCOUNT_FILE?.trim() || "credentials/google-service-account.json";
  return isAbsolute(configured) ? configured : resolve(/*turbopackIgnore: true*/ process.cwd(), configured);
}

function readServiceAccountJson(): ServiceAccountJson {
  const path = credentialFilePath();
  let content: string;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    throw new Error(`Google service-account JSON file was not found or could not be read at '${path}'. Set GOOGLE_SERVICE_ACCOUNT_FILE to the downloaded service-account key JSON path.`);
  }

  let value: unknown;
  try {
    value = JSON.parse(content.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error(`The file at '${path}' is not valid JSON. Use the original downloaded Google service-account key JSON file.`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Google service-account credential file must contain a JSON object.");
  }
  const json = value as ServiceAccountJson;
  if (json.type !== "service_account" || typeof json.client_email !== "string" || typeof json.private_key !== "string") {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_FILE must point to a Google service-account key JSON file containing type, client_email, and private_key—not an OAuth client JSON file.");
  }
  return json;
}

function normalizePrivateKey(raw: string): string {
  let value = raw.trim().replace(/^\uFEFF/, "");
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (typeof parsed === "string") value = parsed;
    } catch {
      value = value.slice(1, -1);
    }
  }
  value = value.replace(/\\+r\\+n/g, "\n").replace(/\\+n/g, "\n").replace(/\\+r/g, "\r").replace(/\r\n?/g, "\n").trim();
  if (!value.startsWith("-----BEGIN ") || !value.includes("PRIVATE KEY-----")) {
    throw new Error("The private_key inside GOOGLE_SERVICE_ACCOUNT_FILE is not a complete PEM private key. Re-download the service-account JSON key from Google Cloud Console.");
  }
  return `${value}\n`;
}

function createCredentials(): Credentials {
  const json = readServiceAccountJson();
  const pem = normalizePrivateKey(json.private_key as string);
  let privateKey: KeyObject;
  try {
    privateKey = createPrivateKey({ key: pem, format: "pem" });
  } catch {
    throw new Error("The private_key in GOOGLE_SERVICE_ACCOUNT_FILE could not be parsed. Re-download the complete service-account key JSON file.");
  }
  if (privateKey.asymmetricKeyType !== "rsa") {
    throw new Error(`Google service-account key must use RSA signing (received ${privateKey.asymmetricKeyType ?? "unknown"}).`);
  }
  return {
    email: (json.client_email as string).trim(),
    privateKey,
    projectId: typeof json.project_id === "string" ? json.project_id : undefined,
  };
}

export function getGoogleServiceAccountConfigurationError(): string | null {
  try {
    createCredentials();
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Google service-account JSON configuration is invalid.";
  }
}

export function hasGoogleServiceAccountCredentials(): boolean {
  return getGoogleServiceAccountConfigurationError() === null;
}

export function getGoogleServiceAccountEmail(): string | null {
  try {
    return createCredentials().email;
  } catch {
    return null;
  }
}

/** Signs a short-lived Google OAuth JWT assertion. No refresh token is used or stored. */
export function createGoogleServiceAccountAssertion(scope: string): string {
  const { email, privateKey } = createCredentials();
  const now = Math.floor(Date.now() / 1000);
  const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const unsigned = `${encode({ alg: "RS256", typ: "JWT" })}.${encode({ iss: email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${signer.sign(privateKey, "base64url")}`;
}
