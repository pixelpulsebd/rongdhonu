import { NextResponse } from "next/server";
import type { BusinessProfile, ServiceRow } from "@/lib/content";
import { getPublicBusinessData } from "@server/api/public/business";
import { getPublicServicesData } from "@server/api/public/services";

type ChatHistoryItem = { role?: "user" | "bot"; content?: string };
type Source = { title: string; url: string };

const normalize = (value: string) =>
  value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

function buildWebsiteKnowledge(business: BusinessProfile | null, services: ServiceRow[]) {
  const serviceNames = services.map((service) => service.name).filter(Boolean);
  const serviceNamesBn = services.map((service) => service.nameBn || service.name).filter(Boolean);
  return [
    {
      patterns: ["service", "services", "offer", "do", "work", "সেবা", "সেবাসমূহ", "কাজ"],
      en: serviceNames.length
        ? `Current published services include ${serviceNames.join(", ")}. Tell me what you want to change and I can help narrow the direction.`
        : "No service catalogue is currently published. Please contact the team for current availability.",
      bn: serviceNamesBn.length
        ? `বর্তমানে প্রকাশিত সেবাগুলোর মধ্যে রয়েছে ${serviceNamesBn.join(", ")}। আপনি কী পরিবর্তন করতে চান জানালে আমি দিকনির্দেশনা দিতে পারি।`
        : "এই মুহূর্তে কোনো সেবা তালিকা প্রকাশিত নেই। বর্তমান সেবা জানতে টিমের সঙ্গে যোগাযোগ করুন।",
    },
    {
      patterns: ["price", "pricing", "cost", "budget", "quote", "quotation", "estimate", "দাম", "মূল্য", "খরচ", "বাজেট", "কোটেশন"],
      en: "We provide tailored quotations because the price depends on the service, surface condition, area and finish. Share the type of space, approximate area and the work you have in mind for a more useful discussion.",
      bn: "আমরা কাজের ধরন অনুযায়ী কাস্টম কোটেশন দিই। মূল্য নির্ভর করে সেবা, সারফেসের অবস্থা, কাজের এলাকা ও ফিনিশের ওপর। স্পেসের ধরন, আনুমানিক আয়তন এবং কাজের ধরন জানালে আরও নির্দিষ্টভাবে আলোচনা করা যাবে।",
    },
    {
      patterns: ["process", "procedure", "steps", "how", "start", "begin", "প্রক্রিয়া", "ধাপ", "শুরু"],
      en: "The published process is managed from the website content system. Please review the visible process section or contact the team for the current sequence.",
      bn: "ওয়েবসাইটের কনটেন্ট সিস্টেমে প্রকাশিত প্রক্রিয়ার ধাপগুলো পরিচালিত হয়। বর্তমান ধাপ দেখতে প্রকাশিত প্রসেস সেকশন দেখুন বা টিমের সঙ্গে যোগাযোগ করুন।",
    },
    {
      patterns: ["address", "location", "office", "where", "ঠিকানা", "লোকেশন", "অফিস", "কোথায়"],
      en: business?.address ? `The listed address is ${business.address}.` : "The business address is not currently published.",
      bn: business?.addressBn ? `তালিকাভুক্ত ঠিকানা হলো ${business.addressBn}।` : business?.address ? `তালিকাভুক্ত ঠিকানা হলো ${business.address}।` : "ব্যবসার ঠিকানা বর্তমানে প্রকাশিত নেই।",
    },
    {
      patterns: ["phone", "call", "contact", "number", "ফোন", "কল", "যোগাযোগ", "নম্বর"],
      en: business?.phone ? `You can use the call option to contact the business at ${business.phone}.` : "A public phone number is not currently published.",
      bn: business?.phone ? `যোগাযোগের জন্য প্রকাশিত ফোন নম্বর হলো ${business.phone}।` : "প্রকাশিত ফোন নম্বর বর্তমানে নেই।",
    },
    {
      patterns: ["email", "mail", "ইমেইল", "মেইল"],
      en: business?.email ? `The listed contact email is ${business.email}.` : "A public contact email is not currently published.",
      bn: business?.email ? `যোগাযোগের জন্য প্রকাশিত ইমেইল হলো ${business.email}।` : "প্রকাশিত যোগাযোগের ইমেইল বর্তমানে নেই।",
    },
    {
      patterns: ["hello", "hi", "hey", "assalam", "good morning", "good afternoon", "good evening", "হ্যালো", "হাই", "আসসালাম"],
      en: "Hello! How can I help you with your project?",
      bn: "হ্যালো! আপনার প্রজেক্ট সম্পর্কে কী জানতে চান?",
    },
  ] as const;
}


function getWebsiteAnswer(message: string, language: "en" | "bn", knowledge: ReturnType<typeof buildWebsiteKnowledge>) {
  const q = normalize(message);
  if (!q) return null;

  let best: { score: number; answer: string } | null = null;
  for (const item of knowledge) {
    const score = item.patterns.reduce((total, pattern) => {
      const p = normalize(pattern);
      return total + (q.includes(p) ? (p.length > 5 ? 2 : 1) : 0);
    }, 0);

    if (score > 0 && (!best || score > best.score)) {
      best = { score, answer: item[language] };
    }
  }

  return best?.answer ?? null;
}

async function searchWeb(query: string, language: "en" | "bn"): Promise<{ answer: string; sources: Source[] } | null> {
  const url = new URL("https://api.duckduckgo.com/");
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("no_html", "1");
  url.searchParams.set("no_redirect", "1");
  url.searchParams.set("skip_disambig", "1");

  const response = await fetch(url, {
    headers: { "User-Agent": "RongDhonuWebsiteAssistant/1.0" },
    next: { revalidate: 900 },
  });

  if (!response.ok) return null;

  const data = await response.json();
  const sources: Source[] = [];

  if (data.AbstractURL && data.AbstractText) {
    sources.push({ title: data.Heading || (language === "bn" ? "ওয়েব ফলাফল" : "Web result"), url: data.AbstractURL });
  }

  for (const topic of Array.isArray(data.RelatedTopics) ? data.RelatedTopics : []) {
    if (sources.length >= 3) break;
    if (topic?.FirstURL && topic?.Text) {
      sources.push({ title: topic.Text, url: topic.FirstURL });
    }
    if (Array.isArray(topic?.Topics)) {
      for (const nested of topic.Topics) {
        if (sources.length >= 3) break;
        if (nested?.FirstURL && nested?.Text) {
          sources.push({ title: nested.Text, url: nested.FirstURL });
        }
      }
    }
  }

  const answer = typeof data.AbstractText === "string" ? data.AbstractText.trim() : "";
  if (!answer && sources.length === 0) return null;

  return {
    answer:
      answer ||
      (language === "bn"
        ? "আপনার প্রশ্নের সাথে সম্পর্কিত কিছু ওয়েব ফলাফল পেয়েছি। সবচেয়ে প্রাসঙ্গিক লিংকগুলো নিচে দেওয়া হলো।"
        : "I found a few web results related to your question. The most relevant links are shown below."),
    sources,
  };
}

async function translateToBengali(text: string): Promise<string> {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return clean;
  try {
    const url = new URL("https://translate.googleapis.com/translate_a/single");
    url.searchParams.set("client", "gtx");
    url.searchParams.set("sl", "auto");
    url.searchParams.set("tl", "bn");
    url.searchParams.set("dt", "t");
    url.searchParams.set("q", clean);
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) return clean;
    const data = await response.json();
    const translated = Array.isArray(data?.[0])
      ? data[0].map((part: unknown) => Array.isArray(part) && typeof part[0] === "string" ? part[0] : "").join("").trim()
      : "";
    return translated || clean;
  } catch {
    return clean;
  }
}

function humanizeWebAnswer(answer: string, query: string, language: "en" | "bn") {
  const clean = answer.replace(/\s+/g, " ").trim();
  if (language === "bn") {
    if (!clean) return `"${query}" সম্পর্কে নির্ভরযোগ্য কোনো ওয়েব উত্তর খুঁজে পাইনি।`;
    return `আমাদের ওয়েবসাইটের তথ্যের মধ্যে এটি পাইনি, তাই ওয়েবে খুঁজেছি। যা পাওয়া গেছে: ${clean}`;
  }
  if (!clean) return `I couldn't find a reliable web answer for "${query}".`;
  return `I couldn't find that in our website information, so I checked the web. Here's what I found: ${clean}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = typeof body?.message === "string" ? body.message.trim() : "";
    const history = Array.isArray(body?.history) ? (body.history as ChatHistoryItem[]) : [];
    const language = body?.language === "bn" ? "bn" : "en";

    if (!message) {
      return NextResponse.json({ error: language === "bn" ? "বার্তা প্রয়োজন।" : "Message is required." }, { status: 400 });
    }

    const [businessResult, servicesResult] = await Promise.all([
      getPublicBusinessData().catch(() => ({ business: null })),
      getPublicServicesData().catch(() => ({ services: [] })),
    ]);
    const websiteAnswer = getWebsiteAnswer(message, language, buildWebsiteKnowledge(businessResult.business, servicesResult.services));
    if (websiteAnswer) {
      return NextResponse.json({
        answer: websiteAnswer,
        webSearch: false,
        sources: [],
      });
    }

    const previousUserMessage =
      history
        .slice(0, -1)
        .reverse()
        .find((item) => item.role === "user" && typeof item.content === "string")?.content || "";

    const contextualQuery = previousUserMessage
      ? `${previousUserMessage}. Follow-up question: ${message}`
      : message;

    try {
      const webResult = await searchWeb(contextualQuery, language);
      if (webResult) {
        const webAnswer = language === "bn"
          ? await translateToBengali(webResult.answer)
          : webResult.answer;
        return NextResponse.json({
          answer: language === "bn"
            ? `আমাদের ওয়েবসাইটে তথ্যটি পাওয়া যায়নি, তাই ওয়েবে খুঁজেছি। যা পাওয়া গেছে: ${webAnswer}`
            : humanizeWebAnswer(webResult.answer, message, language),
          webSearch: true,
          sources: webResult.sources,
        });
      }
    } catch {
      // Search is intentionally a fallback. The assistant still responds gracefully below.
    }

    return NextResponse.json({
      answer: language === "bn"
        ? "এই প্রশ্নের নির্ভরযোগ্য উত্তর দেওয়ার মতো পর্যাপ্ত তথ্য আমাদের ওয়েবসাইটে নেই। আপনি কী করতে চান সে সম্পর্কে একটু বিস্তারিত জানালে আমি আপনাকে উপযুক্ত দিকনির্দেশনা দিতে পারি, অথবা সরাসরি আমাদের টিমের সঙ্গে যোগাযোগ করতে পারেন।"
        : "I don't have enough information on the website to answer that confidently yet. If you tell me a little more about what you're trying to achieve, I can help you narrow it down or you can contact our team directly.",
      webSearch: false,
      sources: [],
    });
  } catch {
    return NextResponse.json({ error: "Unable to process the chat message." }, { status: 500 });
  }
}
