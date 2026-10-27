import type { Service } from "@/app/types/rong-dhonu";

/**
 * Empty fallback only. Live service data comes from the CMS content store.
 * Keeping the array typed preserves the existing imports without shipping fallback records.
 */
export const SERVICES: Service[] = [];

interface LocalizableService {
  id: string;
  name: string;
  nameBn?: string | null;
  category: string;
  categoryBn?: string | null;
  description: string;
  descriptionBn?: string | null;
  bestFor: string;
  bestForBn?: string | null;
}

export function categoryBnFor(_category: string): string | undefined {
  return undefined;
}

export function localizeService(service: LocalizableService, language: "en" | "bn") {
  if (language === "en") {
    return { name: service.name, category: service.category, description: service.description, bestFor: service.bestFor };
  }
  return {
    name: service.nameBn || service.name,
    category: service.categoryBn || service.category,
    description: service.descriptionBn || service.description,
    bestFor: service.bestForBn || service.bestFor,
  };
}
