import type {
  EventCategory,
  ThreatLevel,
  ThreatEvent,
  GeoLocation,
} from "@/types";
import { generateEventId } from "./utils";

const BOILERPLATE_PATTERNS = [
  /skip to (?:main |primary )?content/gi,
  /keyboard shortcuts?(?: for audio player)?/gi,
  /toggle navigation/gi,
  /search(?:\s+the site)?/gi,
  /sign (?:in|up|out)/gi,
  /log (?:in|out)/gi,
  /subscribe(?:\s+now)?/gi,
  /newsletter/gi,
  /privacy policy/gi,
  /terms (?:of (?:service|use)|and conditions)/gi,
  /cookie (?:policy|settings|preferences)/gi,
  /about us/gi,
  /contact us/gi,
  /advertise (?:with us)?/gi,
  /careers/gi,
  /weather (?:today|forecast)?/gi,
  /all rights reserved/gi,
  /copyright \d{4}/gi,
  /follow us on/gi,
  /share (?:this|on)/gi,
  /related (?:articles|stories|posts)/gi,
  /recommended (?:for you|articles)/gi,
  /trending (?:now|stories)/gi,
  /most (?:read|popular|viewed)/gi,
  /read more/gi,
  /continue reading/gi,
  /load(?:ing)? more/gi,
  /view (?:all|more)/gi,
  /see (?:all|more)/gi,
  /advertisement/gi,
  /sponsored (?:content|by)/gi,
  /click here/gi,
  /tap (?:here|to)/gi,
  /download (?:our )?app/gi,
  /get the app/gi,
  /breaking news alert/gi,
  /live updates?/gi,
  /^\s*menu\s*$/gim,
  /^\s*home\s*$/gim,
  /^\s*news\s*$/gim,
  /^\s*sports?\s*$/gim,
  /^\s*entertainment\s*$/gim,
  /^\s*business\s*$/gim,
  /^\s*tech(?:nology)?\s*$/gim,
  /^\s*opinion\s*$/gim,
  /^\s*video\s*$/gim,
  /^\s*photos?\s*$/gim,
];

function cleanContent(text: string): string {
  let cleaned = text;

  // Remove boilerplate patterns (keep markdown for proper rendering)
  for (const pattern of BOILERPLATE_PATTERNS) {
    cleaned = cleaned.replace(pattern, "");
  }

  // Clean up whitespace
  cleaned = cleaned
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s{2,}/g, " ")
    .replace(/^\s+|\s+$/gm, "")
    .trim();

  return cleaned;
}

const CATEGORY_KEYWORDS: Record<EventCategory, string[]> = {
  outbreak: [
    "outbreak",
    "epidemic",
    "spread",
    "spreading",
    "multiple cases",
    "cluster",
    "deaths",
    "fatalities",
    "emergency",
    "containment",
  ],
  case: [
    "case",
    "patient",
    "infected",
    "diagnosed",
    "confirmed",
    "suspected",
    "hospitalized",
    "isolated",
    "quarantine",
    "tested positive",
  ],
  news: [
    "reports",
    "announced",
    "update",
    "latest",
    "breaking",
    "alert",
    "warning",
    "monitoring",
    "officials",
    "authorities",
  ],
  research: [
    "research",
    "study",
    "scientist",
    "findings",
    "investigation",
    "analysis",
    "genome",
    "transmission",
    "pathogen",
    "clinical trial",
  ],
  prevention: [
    "prevention",
    "vaccine",
    "vaccination",
    "measures",
    "precautions",
    "screening",
    "surveillance",
    "contact tracing",
    "health advisory",
    "preparedness",
  ],
};

const THREAT_LEVEL_KEYWORDS: Record<ThreatLevel, string[]> = {
  critical: [
    "major outbreak",
    "high mortality",
    "multiple deaths",
    "rapid spread",
    "emergency declared",
    "urgent",
    "crisis",
    "catastrophic",
    "fatal",
  ],
  high: [
    "deaths reported",
    "confirmed cases",
    "active transmission",
    "spreading",
    "severe",
    "critical condition",
    "escalating",
    "dangerous",
    "warning issued",
  ],
  medium: [
    "isolated cases",
    "monitoring",
    "under observation",
    "suspected",
    "developing",
    "moderate concern",
    "limited transmission",
    "surveillance",
  ],
  low: [
    "contained",
    "resolved",
    "no active spread",
    "recovered",
    "stable",
    "manageable",
    "no new cases",
  ],
  info: [
    "update",
    "report",
    "announcement",
    "research",
    "study",
    "analysis",
    "prevention",
    "advisory",
  ],
};

export function classifyCategory(text: string): EventCategory {
  const lowerText = text.toLowerCase();
  let bestMatch: EventCategory = "news";
  let bestScore = 0;

  (Object.entries(CATEGORY_KEYWORDS) as [EventCategory, string[]][]).forEach(
    ([category, keywords]) => {
      const score = keywords.reduce((acc, keyword) => {
        return acc + (lowerText.includes(keyword.toLowerCase()) ? 1 : 0);
      }, 0);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = category;
      }
    }
  );

  return bestMatch;
}

export function classifyThreatLevel(text: string): ThreatLevel {
  const lowerText = text.toLowerCase();

  for (const [level, keywords] of Object.entries(THREAT_LEVEL_KEYWORDS) as [
    ThreatLevel,
    string[],
  ][]) {
    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return level;
      }
    }
  }

  return "medium";
}

export function extractEntities(text: string): string[] {
  const entities = new Set<string>();

  const orgPatterns = [
    /\b(United Nations|UN|NATO|EU|European Union|WHO|IMF|World Bank)\b/gi,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:government|military|ministry|president|prime minister)/gi,
  ];

  orgPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1]) {
        entities.add(match[1].trim());
      }
    }
  });

  return Array.from(entities);
}

export function extractKeywords(text: string): string[] {
  const allKeywords = [
    ...Object.values(CATEGORY_KEYWORDS).flat(),
    ...Object.values(THREAT_LEVEL_KEYWORDS).flat(),
  ];

  const lowerText = text.toLowerCase();
  const found = allKeywords.filter((keyword) =>
    lowerText.includes(keyword.toLowerCase())
  );

  return [...new Set(found)].slice(0, 10);
}

export function createThreatEvent(
  title: string,
  content: string,
  location: GeoLocation,
  source: string,
  sourceUrl?: string,
  timestamp?: string
): ThreatEvent {
  const cleanedTitle = cleanContent(title);
  const cleanedContent = cleanContent(content);
  const fullText = `${cleanedTitle} ${cleanedContent}`;

  return {
    id: generateEventId(),
    title: cleanedTitle,
    summary: cleanedContent.slice(0, 500),
    category: classifyCategory(fullText),
    threatLevel: classifyThreatLevel(fullText),
    location,
    timestamp: timestamp || new Date().toISOString(),
    source,
    sourceUrl,
    entities: extractEntities(fullText),
    keywords: extractKeywords(fullText),
    rawContent: cleanedContent,
  };
}
