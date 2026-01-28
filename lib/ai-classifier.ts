import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { EventCategory, ThreatLevel, GeoLocation } from "@/types";
import { geocodeLocation, extractLocationsFromText } from "./geocoding";
import {
  classifyCategory as keywordClassifyCategory,
  classifyThreatLevel as keywordClassifyThreatLevel,
} from "./event-classifier";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-nano";

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Zod schema for Nipah virus event classification
const EventClassificationSchema = z.object({
  category: z.enum([
    "outbreak",
    "case",
    "news",
    "research",
    "prevention",
  ]).describe("The type of Nipah virus event: outbreak (active outbreak), case (individual/cluster cases), news (general Nipah virus news), research (studies/findings), prevention (health measures/vaccination)"),
  threatLevel: z.enum(["critical", "high", "medium", "low", "info"]).describe(
    "Severity level: critical (major outbreak, high mortality), high (confirmed cases spreading), medium (isolated cases, monitoring), low (contained/resolved), info (research updates, prevention info)"
  ),
  primaryLocation: z.string().describe(
    "The main geographic location (city, region, or country) where the Nipah virus event is occurring. Use proper names."
  ),
  city: z.string().nullable().describe(
    "The city or town name if identifiable, null otherwise"
  ),
  region: z.string().nullable().describe(
    "The state, province, or region if identifiable, null otherwise"
  ),
  country: z.string().nullable().describe(
    "The country where the event is occurring, if identifiable"
  ),
});

type EventClassification = z.infer<typeof EventClassificationSchema>;

export interface ClassificationResult {
  category: EventCategory;
  threatLevel: ThreatLevel;
  location: GeoLocation | null;
}

/**
 * Classify a Nipah virus event using OpenAI structured outputs
 * Extracts category, threat level, and location in a single API call
 */
async function classifyWithAI(
  title: string,
  content: string
): Promise<EventClassification | null> {
  if (!openai) return null;

  try {
    const completion = await openai.chat.completions.parse({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a health intelligence analyst specializing in Nipah virus tracking. Analyze the headline and content to determine:
1. Category - the type of Nipah virus event:
   - outbreak: active Nipah virus outbreaks affecting multiple people
   - case: individual or cluster case reports of Nipah virus
   - news: general news coverage about Nipah virus
   - research: scientific studies, findings, or research on Nipah virus
   - prevention: prevention measures, vaccination efforts, health advisories
2. Threat Level - severity based on outbreak scale and mortality risk
3. Location - the primary geographic location where this event is happening

For threat level:
- critical: major outbreak with high mortality, rapid spread, multiple deaths
- high: confirmed Nipah cases with active transmission, deaths reported
- medium: isolated cases under monitoring, limited transmission
- low: contained or resolved cases, no active spread
- info: research updates, prevention information, historical context`,
        },
        {
          role: "user",
          content: `Headline: ${title}\n\nContent: ${content.slice(0, 1000)}`,
        },
      ],
      response_format: zodResponseFormat(EventClassificationSchema, "event_classification"),
      max_tokens: 200,
      temperature: 0,
    });

    const message = completion.choices[0]?.message;
    if (message?.parsed) {
      return message.parsed;
    }

    return null;
  } catch (error) {
    console.error("AI classification error:", error);
    return null;
  }
}

/**
 * Classify a Nipah virus event - uses AI if available, falls back to keyword matching
 * Returns category, threat level, and geocoded location
 */
export async function classifyEvent(
  title: string,
  content: string
): Promise<ClassificationResult> {
  const fullText = `${title} ${content}`;

  // Try AI classification first
  const aiResult = await classifyWithAI(title, content);

  if (aiResult) {
    // AI classification succeeded - geocode the location with cascading specificity
    let location: GeoLocation | null = null;

    // Try most specific first: city + region + country
    if (aiResult.city && aiResult.country) {
      const cityQuery = aiResult.region
        ? `${aiResult.city}, ${aiResult.region}, ${aiResult.country}`
        : `${aiResult.city}, ${aiResult.country}`;
      location = await geocodeLocation(cityQuery);
    }

    // Try the primary location string (should be most specific)
    if (!location && aiResult.primaryLocation) {
      location = await geocodeLocation(aiResult.primaryLocation);
    }

    // Try region + country
    if (!location && aiResult.region && aiResult.country) {
      location = await geocodeLocation(`${aiResult.region}, ${aiResult.country}`);
    }

    // Last resort: just country
    if (!location && aiResult.country) {
      location = await geocodeLocation(aiResult.country);
    }

    return {
      category: aiResult.category as EventCategory,
      threatLevel: aiResult.threatLevel as ThreatLevel,
      location,
    };
  }

  // Fall back to keyword-based classification
  const category = keywordClassifyCategory(fullText);
  const threatLevel = keywordClassifyThreatLevel(fullText);

  // Fall back to regex-based location extraction
  const locationCandidates = extractLocationsFromText(fullText);
  let location: GeoLocation | null = null;

  for (const candidate of locationCandidates) {
    location = await geocodeLocation(candidate);
    if (location) break;
  }

  return {
    category,
    threatLevel,
    location,
  };
}

/**
 * Check if AI classification is available
 */
export function isAIClassificationEnabled(): boolean {
  return !!openai;
}
