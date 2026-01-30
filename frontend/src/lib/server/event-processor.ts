import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { z } from 'zod';
import { geocodeLocation } from './geocoding';
import { OPENAI_API_KEY, OPENAI_MODEL } from './env';
import type { Topic } from './db/schema';
import type { CollectedItem } from './db/collector';

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Schema for extracted event data
const ExtractedEventSchema = z.object({
	title: z.string().describe('A concise headline summarizing the event (max 100 chars)'),
	summary: z.string().describe('A 1-2 sentence summary of the key facts'),
	threat_level: z
		.enum(['critical', 'high', 'medium', 'low', 'info'])
		.describe(
			'Severity: critical (major incident, high impact), high (significant threat), medium (notable concern), low (minor issue), info (informational only)'
		),
	category: z.string().describe('Event category (e.g., outbreak, cyberattack, conflict, sanctions)'),
	location_name: z.string().nullable().describe('Specific location name (city, facility, region)'),
	city: z.string().nullable().describe('City or town where the event occurred'),
	region: z.string().nullable().describe('State, province, or region'),
	country: z.string().nullable().describe('Country name'),
	country_code: z
		.string()
		.nullable()
		.describe('ISO 3166-1 alpha-2 country code (e.g., US, IN, UA)'),
	entities: z
		.array(z.string())
		.describe('Key entities mentioned (organizations, people, groups)'),
	keywords: z
		.array(z.string())
		.describe('Relevant keywords/tags for this event'),
	timestamp: z
		.string()
		.nullable()
		.describe('Event date/time in ISO 8601 format if mentioned, null otherwise'),
	is_relevant: z
		.boolean()
		.describe('Whether this content is actually relevant to the topic being tracked')
});

type ExtractedEvent = z.infer<typeof ExtractedEventSchema>;

// Topic-specific system prompts
const TOPIC_PROMPTS: Record<Topic, string> = {
	diseases: `You are a health intelligence analyst. Extract structured data about disease outbreaks, epidemics, health emergencies, and public health threats. Focus on:
- Disease name, type, and strain
- Case counts, deaths, hospitalizations
- Geographic spread and affected areas
- Response measures and containment efforts
- Threat level based on transmissibility, mortality, and spread`,

	cybersec: `You are a cybersecurity intelligence analyst. Extract structured data about cyber threats, breaches, vulnerabilities, and attacks. Focus on:
- Attack type (ransomware, DDoS, phishing, APT, etc.)
- Threat actors and attribution
- Affected systems, organizations, or sectors
- Impact and damage assessment
- Threat level based on scope, sophistication, and impact`,

	military: `You are a defense intelligence analyst. Extract structured data about military conflicts, defense activities, and security incidents. Focus on:
- Type of military action or conflict
- Parties involved and alliances
- Geographic locations and territories
- Casualties and damage
- Threat level based on escalation potential and strategic impact`,

	geopolitics: `You are a geopolitical intelligence analyst. Extract structured data about political events, international relations, sanctions, and diplomatic incidents. Focus on:
- Political actors and governments involved
- Type of event (sanctions, treaties, elections, protests, coups)
- International implications
- Economic or strategic impact
- Threat level based on stability implications and global impact`
};

// Raw input types
export interface RawTextInput {
	type: 'text';
	content: string;
	source_url?: string;
	source_name?: string;
	published_at?: string;
}

export interface RawRSSItem {
	type: 'rss';
	title: string;
	description?: string;
	content?: string;
	link: string;
	pubDate?: string;
	source_name: string;
}

export interface RawAPIResponse {
	type: 'api';
	title?: string;
	content?: string;
	description?: string;
	url?: string;
	source?: string;
	date?: string;
	metadata?: Record<string, unknown>;
}

export type RawInput = RawTextInput | RawRSSItem | RawAPIResponse;

/**
 * Normalize raw input to a standard format for processing
 */
function normalizeInput(input: RawInput): { title: string; content: string; url?: string; source?: string; date?: string } {
	switch (input.type) {
		case 'text':
			// Extract title from first line or first sentence
			const lines = input.content.trim().split('\n');
			const firstLine = lines[0].trim();
			const title = firstLine.length > 100 ? firstLine.slice(0, 97) + '...' : firstLine;
			return {
				title,
				content: input.content,
				url: input.source_url,
				source: input.source_name,
				date: input.published_at
			};

		case 'rss':
			return {
				title: input.title,
				content: input.content || input.description || '',
				url: input.link,
				source: input.source_name,
				date: input.pubDate
			};

		case 'api':
			return {
				title: input.title || 'Untitled',
				content: input.content || input.description || '',
				url: input.url,
				source: input.source,
				date: input.date
			};
	}
}

/**
 * Extract structured event data using OpenAI
 */
async function extractWithAI(
	topic: Topic,
	title: string,
	content: string,
	keywords?: string[]
): Promise<ExtractedEvent | null> {
	if (!openai) return null;

	const keywordContext = keywords?.length
		? `\nKeywords being tracked: ${keywords.join(', ')}`
		: '';

	try {
		const completion = await openai.beta.chat.completions.parse({
			model: OPENAI_MODEL,
			messages: [
				{
					role: 'system',
					content: `${TOPIC_PROMPTS[topic]}

Extract structured intelligence data from the provided content. Be precise with locations - extract the specific city/town where events are occurring, not where the news source is based.${keywordContext}

If the content is not relevant to the topic being tracked, set is_relevant to false.`
				},
				{
					role: 'user',
					content: `Title: ${title}\n\nContent: ${content.slice(0, 2000)}`
				}
			],
			response_format: zodResponseFormat(ExtractedEventSchema, 'extracted_event'),
			max_tokens: 500,
			temperature: 0
		});

		const message = completion.choices[0]?.message;
		return message?.parsed ?? null;
	} catch (error) {
		console.error('Event extraction error:', error);
		return null;
	}
}

/**
 * Fallback extraction without AI (basic keyword matching)
 */
function extractWithoutAI(
	title: string,
	content: string,
	keywords?: string[]
): Partial<ExtractedEvent> {
	const fullText = `${title} ${content}`.toLowerCase();

	// Basic threat level detection
	let threat_level: ExtractedEvent['threat_level'] = 'info';
	if (/critical|emergency|catastroph|mass casualt|pandemic/i.test(fullText)) {
		threat_level = 'critical';
	} else if (/outbreak|attack|breach|conflict|crisis/i.test(fullText)) {
		threat_level = 'high';
	} else if (/warning|concern|incident|case|threat/i.test(fullText)) {
		threat_level = 'medium';
	} else if (/monitor|watch|minor|resolved|contained/i.test(fullText)) {
		threat_level = 'low';
	}

	// Check keyword relevance
	const is_relevant = !keywords?.length || keywords.some((kw) => fullText.includes(kw.toLowerCase()));

	return {
		title: title.slice(0, 100),
		summary: content.slice(0, 200),
		threat_level,
		is_relevant,
		keywords: keywords?.filter((kw) => fullText.includes(kw.toLowerCase())) ?? []
	};
}

/**
 * Process a raw input and extract structured event data
 */
export async function processRawInput(
	topic: Topic,
	input: RawInput,
	keywords?: string[]
): Promise<CollectedItem | null> {
	const normalized = normalizeInput(input);

	// Skip empty content
	if (!normalized.content.trim() && !normalized.title.trim()) {
		return null;
	}

	// Try AI extraction first
	let extracted = await extractWithAI(topic, normalized.title, normalized.content, keywords);

	// Fall back to basic extraction if AI fails
	if (!extracted) {
		const fallback = extractWithoutAI(normalized.title, normalized.content, keywords);
		extracted = {
			title: fallback.title || normalized.title,
			summary: fallback.summary || normalized.content.slice(0, 200),
			threat_level: fallback.threat_level || 'info',
			category: topic,
			location_name: null,
			city: null,
			region: null,
			country: null,
			country_code: null,
			entities: [],
			keywords: fallback.keywords || [],
			timestamp: normalized.date || null,
			is_relevant: fallback.is_relevant ?? true
		};
	}

	// Skip non-relevant content
	if (!extracted.is_relevant) {
		return null;
	}

	// Geocode location if we have location data
	let latitude: number | undefined;
	let longitude: number | undefined;
	let resolvedCountry = extracted.country;
	let resolvedCountryCode = extracted.country_code;

	if (extracted.city && extracted.country) {
		const locationQuery = extracted.region
			? `${extracted.city}, ${extracted.region}, ${extracted.country}`
			: `${extracted.city}, ${extracted.country}`;

		const geo = await geocodeLocation(locationQuery);
		if (geo) {
			latitude = geo.latitude;
			longitude = geo.longitude;
			resolvedCountry = geo.country || extracted.country;
		}
	} else if (extracted.location_name) {
		const geo = await geocodeLocation(extracted.location_name);
		if (geo) {
			latitude = geo.latitude;
			longitude = geo.longitude;
			resolvedCountry = geo.country || extracted.country;
		}
	} else if (extracted.country) {
		const geo = await geocodeLocation(extracted.country);
		if (geo) {
			latitude = geo.latitude;
			longitude = geo.longitude;
		}
	}

	return {
		title: extracted.title,
		content: normalized.content,
		summary: extracted.summary,
		source_url: normalized.url,
		source_name: normalized.source,
		location_name: extracted.location_name || extracted.city || extracted.region || extracted.country || undefined,
		latitude,
		longitude,
		country: resolvedCountry || undefined,
		country_code: resolvedCountryCode || undefined,
		threat_level: extracted.threat_level,
		category: extracted.category,
		tags: extracted.entities,
		keywords: extracted.keywords,
		timestamp: extracted.timestamp || normalized.date,
		metadata: {
			extracted_at: new Date().toISOString(),
			ai_extracted: !!openai
		}
	};
}

/**
 * Process multiple raw inputs in batch
 */
export async function processRawInputs(
	topic: Topic,
	inputs: RawInput[],
	keywords?: string[]
): Promise<CollectedItem[]> {
	const results: CollectedItem[] = [];

	for (const input of inputs) {
		const processed = await processRawInput(topic, input, keywords);
		if (processed) {
			results.push(processed);
		}
	}

	return results;
}

/**
 * Quick relevance check without full extraction (for filtering)
 */
export function isLikelyRelevant(content: string, keywords: string[]): boolean {
	if (!keywords.length) return true;
	const lowerContent = content.toLowerCase();
	return keywords.some((kw) => lowerContent.includes(kw.toLowerCase()));
}
