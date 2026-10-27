import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { allocateId, mutateTable, timestamp } from "@/lib/drive-store";
import { isSameOriginRequest } from "@/lib/publicRequest";
import { CONSENT_VERSION, getPublicProfile, setPublicProfileCookie } from "@/lib/publicProfile";

interface ContactBody { website?: string; consentAccepted?: boolean; name?: string; email?: string; phone?: string; serviceInterest?: string; message?: string }
function isValidEmail(value: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
async function notifyByEmail(submission: { name: string; email: string; phone: string; serviceInterest: string; message: string }) {
  const host = process.env.SMTP_HOST; if (!host) return;
  try {
    const transporter = nodemailer.createTransport({ host, port: Number(process.env.SMTP_PORT ?? 587), secure: process.env.SMTP_SECURE === "true", auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined });
    await transporter.sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to: process.env.CONTACT_NOTIFY_EMAIL || process.env.SMTP_USER, replyTo: submission.email, subject: `New enquiry from ${submission.name}`, text: [`Name: ${submission.name}`, `Email: ${submission.email}`, `Phone: ${submission.phone || "—"}`, `Service interest: ${submission.serviceInterest || "—"}`, "", submission.message].join("\n") });
  } catch (error) { console.error("Contact notification email failed (submission was still saved):", error); }
}
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: "This form submission is not allowed." }, { status: 403 });
  let body: ContactBody;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const name = String(body.name ?? "").trim().slice(0, 160); const email = String(body.email ?? "").trim().slice(0, 200);
  const phone = String(body.phone ?? "").trim().slice(0, 40); const serviceInterest = String(body.serviceInterest ?? "").trim().slice(0, 160);
  const message = String(body.message ?? "").trim().slice(0, 4000); const honeypot = String(body.website ?? "").trim().slice(0, 120);
  if (honeypot) return NextResponse.json({ ok: true });
  if (body.consentAccepted !== true) return NextResponse.json({ error: "Please accept the form consent before submitting.", code: "consent_required" }, { status: 400 });
  if (!name || !email || !message) return NextResponse.json({ error: "Name, email and message are required.", code: "required" }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: "Enter a valid email address.", code: "invalid_email" }, { status: 400 });
  await mutateTable("contact_submissions", (document) => {
    const now = timestamp();
    document.rows.push({ id: allocateId(document), name, email, phone: phone || null, service_interest: serviceInterest || null, message, status: "new", consent_version: CONSENT_VERSION, consent_at: now, created_at: now });
  });
  const browserProfile = await getPublicProfile();
  await setPublicProfileCookie({ ...browserProfile, name, email, phone, provider: browserProfile?.provider ?? "form", providerSubject: browserProfile?.providerSubject });
  await notifyByEmail({ name, email, phone, serviceInterest, message });
  return NextResponse.json({ ok: true });
}
