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

const env = (name: string): string => process.env[name]?.trim() ?? "";
const serviceAccountEmail = (): string => env("GOOGLE_SERVICE_ACCOUNT_EMAIL") || env("GOOGLE_CLIENT_EMAIL");

/** True when direct environment credentials are present (complete or partial). */
export function usesGoogleServiceAccountEnvironmentCredentials(): boolean {
  return Boolean(serviceAccountEmail() || env("GOOGLE_PRIVATE_KEY"));
}

function credentialFilePath(): string {
  const configured = env("GOOGLE_SERVICE_ACCOUNT_FILE") || "credentials/google-service-account.json";
  return isAbsolute(configured) ? configured : resolve(/*turbopackIgnore: true*/ process.cwd(), configured);
}

function readServiceAccountJson(): ServiceAccountJson {
  // Prefer explicit environment variables. This works with .env locally and the
  // hosting provider's environment-variable settings in production.
  const email = serviceAccountEmail();
  const privateKey = env("GOOGLE_PRIVATE_KEY");
  if (email || privateKey) {
    if (!email || !privateKey) {
      throw new Error("Set both GOOGLE_SERVICE_ACCOUNT_EMAIL (or GOOGLE_CLIENT_EMAIL) and GOOGLE_PRIVATE_KEY. For GOOGLE_PRIVATE_KEY, encode PEM line breaks as \n inside .env.");
    }
    return {
      type: "service_account",
      client_email: email,
      private_key: privateKey,
      project_id: env("GOOGLE_PROJECT_ID") || undefined,
    };
  }

  // Backwards-compatible fallback for the downloaded Google service-account JSON.
  const path = credentialFilePath();
  let content: string;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    throw new Error(`Google service-account credentials were not found in environment variables or at '${path}'. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY, or configure GOOGLE_SERVICE_ACCOUNT_FILE.`);
  }

  let value: unknown;
  try {
    value = JSON.parse(content.replace(/^\uFEFF/, ""));
  } catch {
    throw new Error(`The file at '${path}' is not valid JSON. Use the original downloaded service-account key JSON file.`);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Google service-account credential file must contain a JSON object.");
  }
  return value as ServiceAccountJson;
}

function normalizePrivateKey(raw: string): string {
  let value = raw.trim().replace(/^\uFEFF/, "");
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    if (value.startsWith('"')) {
      try {
        const parsed: unknown = JSON.parse(value);
        if (typeof parsed === "string") value = parsed;
      } catch {
        value = value.slice(1, -1);
      }
    } else {
      value = value.slice(1, -1);
    }
  }
  value = value.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\r\n?/g, "\n").trim();
  if (!value.startsWith("-----BEGIN ") || !value.includes("PRIVATE KEY-----")) {
    throw new Error("GOOGLE_PRIVATE_KEY (or the private_key in GOOGLE_SERVICE_ACCOUNT_FILE) is not a complete PEM private key. Check that the full key was copied and newlines are encoded correctly.");
  }
  return `${value}\n`;
}

function createCredentials(): Credentials {
  const json = readServiceAccountJson();
  if (json.type !== "service_account" || typeof json.client_email !== "string" || typeof json.private_key !== "string") {
    throw new Error("Configure GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY, or point GOOGLE_SERVICE_ACCOUNT_FILE to a Google service-account key JSON containing type, client_email, and private_key. OAuth client JSON is not supported.");
  }
  const pem = normalizePrivateKey(json.private_key);
  let privateKey: KeyObject;
  try {
    privateKey = createPrivateKey({ key: pem, format: "pem" });
  } catch {
    throw new Error("The Google service-account private key could not be parsed. Verify the complete PEM key and its newline formatting.");
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
    return error instanceof Error ? error.message : "Google service-account configuration is invalid.";
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
