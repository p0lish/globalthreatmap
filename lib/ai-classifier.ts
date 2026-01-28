import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { config, z } from "zod";
import type { EventCategory, ThreatLevel, GeoLocation } from "@/types";
import { geocodeLocation, extractLocationsFromText } from "./geocoding";
import {
  classifyCategory as keywordClassifyCategory,
  classifyThreatLevel as keywordClassifyThreatLevel,
} from "./event-classifier";
import Config from "@/config/system_setup";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-nano";

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Zod schema for Nipah virus event classification
const EventClassificationSchema = z.object({
  category: z.enum(Config.diseasse.category)
    .describe(Config.diseasse.description),
  threatLevel: z.enum(Config.diseasse.threatLevels).describe(Config.diseasse.threatDescription),
  primaryLocation: z.string().describe(Config.diseasse.primaryLocation),
  city: z.string().nullable().describe(Config.diseasse.city),
  region: z.string().nullable().describe(Config.diseasse.region),
  country: z.string().nullable().describe(Config.diseasse.country),
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
        ...Config.diseasse.agents,
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
