"use client";

import { BRAND } from "@/app/data/brand";
import { Mail, MapPin, Navigation, Phone } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageContext";
import SectionHeader from "./SectionHeader";
import { useLazyPublicData } from "./useLazyPublicData";
import type { CmsBusiness } from "@/app/types/public-cms";

export default function ContactSection() {
  const { t, pick } = useLanguage();
  const { ref, data, loading, error } = useLazyPublicData<{ business: CmsBusiness }>("/api/public/business");
  const business = data?.business;
  const name = business?.name || pick(BRAND.name, BRAND.nameBn);
  const email = business?.email || BRAND.email;
  const phone = business?.phone || BRAND.phone;
  const website = business?.website || BRAND.website;
  const address = business?.address ? pick(business.address, business.addressBn) : pick(BRAND.address, BRAND.addressBn);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [mapInView, setMapInView] = useState(false);
  const contactRows = [[t("address"), address], [t("phone"), phone], [t("email"), email], [t("website"), website]];

  useEffect(() => {
    const node = mapRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      const ratio = entry?.intersectionRatio ?? 0;
      setMapInView((current) => (ratio >= 0.52 ? true : ratio <= 0.10 ? false : current));
    }, { threshold: [0.1, 0.52, 0.85], rootMargin: "-8% 0px -8% 0px" });
    observer.observe(node);
    return () => observer.disconnect();
  }, [data]);

  const setSectionRef = (node: HTMLElement | null) => {
    ref(node);
  };

  return (
    <>
      <section ref={setSectionRef} id="contact" className="section-surface section-y pattern-contact bg-surface">
        <div className="section-shell">
          <SectionHeader eyebrow={t("contactUs")} title={t("readyTransform")} titleId="contact-title" />

          {loading || !data ? <div className="grid gap-6 lg:grid-cols-2"><div className="h-104 rounded-2xl border border-border bg-surface-2" /><div className="h-104 rounded-2xl border border-border bg-surface-2" /></div> : error ? <div className="glass-panel p-5 text-sm text-muted">{error}</div> : (
            <div className="grid items-stretch gap-4 lg:grid-cols-2 lg:gap-5">
              <div className="flex min-h-0 min-w-0 flex-col gap-3">
                <div ref={mapRef} className="glass-card relative flex flex-1 flex-col overflow-hidden p-2">
                  <div className="relative min-h-64 flex-1 overflow-hidden rounded-2xl border border-border/70 bg-surface">
                    <iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3651.072368477425!2d90.36670307525827!3d23.780437178649944!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3755c0b14c721e6b%3A0x69c84dc77723df8b!2s256%2C%202%20W%20Agargaon%2C%20Dhaka%201207!5e0!3m2!1sen!2sbd!4v1793075044076!5m2!1sen!2sbd" width="600" height="450" loading="lazy">{mapInView}</iframe>
                    <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                      <div className="glass-panel max-w-[75%] px-3 py-2"><p className="text-[8px] font-black uppercase tracking-[0.16em] text-primary">{t("officeLocation")}</p><p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-4 text-foreground sm:text-xs">{address}</p></div>
                      <span className="glass-panel grid h-10 w-10 shrink-0 place-items-center text-primary"><Navigation className="h-4 w-4" aria-hidden="true" /></span>
                    </div>
                  </div>
                </div>
                <div className="glass-panel flex items-start gap-3 p-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><MapPin className="h-4.5 w-4.5" aria-hidden="true" /></span>
                  <div className="min-w-0"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-primary">{t("address")}</p><p className="mt-1 text-sm leading-6 text-muted-strong">{address}</p></div>
                </div>
              </div>
              <div className="glass-card flex min-w-0 flex-col gap-3 p-4 sm:p-5">
                <div className="mb-4 flex items-start justify-between gap-4"><div><h3 className="text-base font-black uppercase text-foreground sm:text-xl">{t("businessInfo")}</h3><p className="mt-1 text-xs text-muted">{name}</p></div><span className="glass-toggle rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-primary">{t("dhaka")}</span></div>
                <div className="divide-y divide-border">
                  {contactRows.filter(([label]) => label !== t("address")).map(([label, value]) => <div key={label} className="grid grid-cols-[72px_1fr] gap-4 py-3 sm:grid-cols-[100px_1fr]"><span className="text-[9px] font-black uppercase tracking-wider text-muted">{label}</span><span className="wrap-break-word text-xs leading-relaxed text-muted-strong sm:text-sm">{value}</span></div>)}
                </div>

                <div className="glass-panel p-4 sm:p-5"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">{t("nextStep")}</p><p className="mt-2 text-sm leading-relaxed text-muted-strong">{t("nextStepText")}</p></div>
                
                <div className="glass-panel min-w-0 p-4 sm:p-5">
                  <p className="text-sm leading-relaxed text-muted sm:text-base">{t("contactIntro")}</p>
                  <div className="mt-4 flex flex-wrap justify-center gap-3">
                    <a href={`mailto:${email}`} className="btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest"><Mail className="h-3.5 w-3.5" aria-hidden="true" />{t("emailUs")}</a>
                    <a href={`tel:${phone.replace(/[^0-9+]/g, "")}`} className="btn-outline-primary inline-flex items-center gap-2 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest"><Phone className="h-3.5 w-3.5" aria-hidden="true" />{t("callUs")}</a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
