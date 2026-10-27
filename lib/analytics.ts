import "server-only";
import { createHash } from "node:crypto";
import { allocateId, mutateTable, timestamp } from "@/lib/drive-store";

export interface VisitorPayload {
  visitorId: string;
  sessionId: string;
  path: string;
  pageTitle?: string;
  referrer?: string;
  userAgent?: string;
  language?: string;
  languages?: string;
  timezone?: string;
  platform?: string;
  screenWidth?: number;
  screenHeight?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  cookiesEnabled?: boolean;
  browser?: string;
  operatingSystem?: string;
  deviceType?: string;
  isNewSession?: boolean;
}

const MAX_TEXT = 1000;
const MAX_PATH = 500;
const ANALYTICS_SALT = process.env.ANALYTICS_SALT || process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "rongdhonu-analytics";
function clean(value: unknown, max = MAX_TEXT): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text ? text.slice(0, max) : null;
}
function int(value: unknown, max = 10000): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n <= max ? n : null;
}
export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`${ANALYTICS_SALT}:${ip}`).digest("hex");
}
export function maskIp(ip: string | null): string | null {
  if (!ip) return null;
  const value = ip.trim();
  if (value.includes(".")) {
    const parts = value.split(".");
    if (parts.length === 4) return `${parts[0]}.${parts[1]}.***.***`;
  }
  if (value.includes(":")) return value.split(":").slice(0, 2).join(":") + ":****";
  return "***";
}
export function getRequestIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return request.headers.get("x-real-ip")?.trim() || null;
}
export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return false;
  return /bot|crawler|spider|crawling|slurp|bingpreview|facebookexternalhit|whatsapp/i.test(userAgent);
}

export async function recordVisitor(payload: VisitorPayload, request: Request): Promise<void> {
  const visitorId = clean(payload.visitorId, 80);
  const sessionId = clean(payload.sessionId, 80);
  const path = clean(payload.path, MAX_PATH);
  if (!visitorId || !sessionId || !path) return;
  const userAgent = clean(payload.userAgent, 1200);
  if (isBot(userAgent)) return;
  const ip = getRequestIp(request);
  const now = timestamp();
  const fields = {
    ip_hash: hashIp(ip), ip_masked: maskIp(ip), user_agent: userAgent,
    browser: clean(payload.browser, 120), operating_system: clean(payload.operatingSystem, 120), device_type: clean(payload.deviceType, 40),
    language: clean(payload.language, 64), languages: clean(payload.languages, 400), timezone: clean(payload.timezone, 120), platform: clean(payload.platform, 120),
    screen_width: int(payload.screenWidth), screen_height: int(payload.screenHeight), viewport_width: int(payload.viewportWidth), viewport_height: int(payload.viewportHeight),
    cookies_enabled: typeof payload.cookiesEnabled === "boolean" ? payload.cookiesEnabled : null,
    country: clean(request.headers.get("x-vercel-ip-country"), 64), region: clean(request.headers.get("x-vercel-ip-country-region"), 128),
    city: clean(request.headers.get("x-vercel-ip-city"), 128), referrer: clean(payload.referrer, MAX_PATH), last_path: path,
  };
  await mutateTable("site_visitors", (document) => {
    const existing = document.rows.find((row) => String(row.visitor_id) === visitorId);
    if (existing) {
      existing.last_seen_at = now;
      existing.visit_count = Number(existing.visit_count ?? 0) + 1;
      existing.session_count = Number(existing.session_count ?? 0) + (payload.isNewSession ? 1 : 0);
      for (const [key, value] of Object.entries(fields)) if (value != null) existing[key] = value;
      existing.updated_at = now;
    } else {
      document.rows.push({ visitor_id: visitorId, first_seen_at: now, last_seen_at: now, visit_count: 1, session_count: payload.isNewSession ? 1 : 0, landing_path: path, updated_at: now, ...fields });
    }
  });
  await mutateTable("site_visit_events", (document) => {
    document.rows.push({
      id: allocateId(document), visitor_id: visitorId, session_id: sessionId, visited_at: now, path,
      page_title: clean(payload.pageTitle, 300), referrer: clean(payload.referrer, MAX_PATH), event_name: "page_view",
    });
  });
}
