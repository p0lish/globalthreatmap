import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { EventCategory, ThreatLevel, GeoLocation } from "$lib/types";
import { geocodeLocation, extractLocationsFromText } from "./geocoding";
import { classifyCategory as keywordClassifyCategory, classifyThreatLevel as keywordClassifyThreatLevel } from "./event-classifier";
import Config from "./config";
import { OPENAI_API_KEY, OPENAI_MODEL } from "./env";

const openai = OPENAI_API_KEY ? new OpenAI({ apiKey: OPENAI_API_KEY }) : null;

// Zod schema for Nipah virus event classification
const EventClassificationSchema = z.object({
	category: z.enum(Config.diseasse.category as unknown as [string, ...string[]]).describe(Config.diseasse.description),
	threatLevel: z.enum(Config.diseasse.threatLevels as unknown as [string, ...string[]]).describe(Config.diseasse.threatDescription),
	primaryLocation: z.string().describe(Config.diseasse.primaryLocation),
	city: z.string().nullable().describe(Config.diseasse.city),
	region: z.string().nullable().describe(Config.diseasse.region),
	country: z.string().nullable().describe(Config.diseasse.country)
});

type EventClassification = z.infer<typeof EventClassificationSchema>;

export interface ClassificationResult {
	category: EventCategory;
	threatLevel: ThreatLevel;
	location: GeoLocation | null;
}

async function classifyWithAI(title: string, content: string): Promise<EventClassification | null> {
	if (!openai) return null;

	try {
		const completion = await openai.beta.chat.completions.parse({
			model: OPENAI_MODEL,
			messages: [
				...Config.diseasse.agents,
				{
					role: "user",
					content: `Headline: ${title}\n\nContent: ${content.slice(0, 1000)}`
				}
			],
			response_format: zodResponseFormat(EventClassificationSchema, "event_classification"),
			max_tokens: 200,
			temperature: 0
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

export async function classifyEvent(title: string, content: string): Promise<ClassificationResult> {
	const fullText = `${title} ${content}`;

	const aiResult = await classifyWithAI(title, content);

	if (aiResult) {
		let location: GeoLocation | null = null;

		if (aiResult.city && aiResult.country) {
			const cityQuery = aiResult.region
				? `${aiResult.city}, ${aiResult.region}, ${aiResult.country}`
				: `${aiResult.city}, ${aiResult.country}`;
			location = await geocodeLocation(cityQuery);

			if (!location) {
				location = await geocodeLocation(aiResult.city);
			}
		}

		if (!location && aiResult.primaryLocation) {
			location = await geocodeLocation(aiResult.primaryLocation);
		}

		if (!location && !aiResult.city && aiResult.region && aiResult.country) {
			location = await geocodeLocation(`${aiResult.region}, ${aiResult.country}`);
		}

		if (!location && !aiResult.city && !aiResult.primaryLocation && aiResult.country) {
			location = await geocodeLocation(aiResult.country);
		}

		return {
			category: aiResult.category as EventCategory,
			threatLevel: aiResult.threatLevel as ThreatLevel,
			location
		};
	}

	const category = keywordClassifyCategory(fullText);
	const threatLevel = keywordClassifyThreatLevel(fullText);

	const locationCandidates = extractLocationsFromText(fullText);
	let location: GeoLocation | null = null;

	for (const candidate of locationCandidates) {
		location = await geocodeLocation(candidate);
		if (location) break;
	}

	return {
		category,
		threatLevel,
		location
	};
}

export function isAIClassificationEnabled(): boolean {
	return !!openai;
}
