import { json, type RequestHandler } from "@sveltejs/kit";
import { searchEvents } from "$lib/server/valyu";
import { isSelfHostedMode } from "$lib/server/app-mode";
import { classifyEvent } from "$lib/server/ai-classifier";
import { generateEventId } from "$lib/server/utils";
import { extractKeywords, extractEntities } from "$lib/server/event-classifier";
import type { ThreatEvent } from "$lib/types";

const THREAT_QUERIES = [
	"Nipah virus outbreak",
	"Nipah virus cases",
	"Nipah virus news",
	"Nipah virus deaths",
	"Nipah henipavirus",
	"Nipah virus Kerala",
	"Nipah virus Bangladesh"
];

function cleanContent(text: string): string {
	return text
		.replace(/skip to (?:main |primary )?content/gi, "")
		.replace(/keyboard shortcuts?/gi, "")
		.replace(/\n{3,}/g, "\n\n")
		.replace(/\s{2,}/g, " ")
		.trim();
}

const BLOCKED_DOMAINS = ["wikipedia.org", "brighteon.com", "fortinet.com", "cisa.gov"];

const GENERIC_TITLE_PATTERNS = [
	/\| topic$/i,
	/\| homeland security$/i,
	/\| fortinet$/i,
	/^natural disasters$/i,
	/^countering terrorism$/i,
	/^maritime piracy:/i,
	/^assessment of global/i,
	/^recent cyber attacks in \d{4}/i
];

function isValidLocation(location: { placeName?: string; country?: string }): boolean {
	const name = location.placeName || location.country || "";
	if (name.length < 2) return false;
	if (name.toLowerCase() === "routes") return false;
	if (/^[a-z\s]+$/i.test(name) && name.length < 3) return false;
	if (["unknown", "global", "worldwide", "n/a"].includes(name.toLowerCase())) return false;
	return true;
}

const THREAT_LEVEL_PRIORITY: Record<string, number> = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3,
	info: 4
};

async function processSearchResults(
	results: Array<{
		title: string;
		url: string;
		content: string;
		publishedDate?: string;
		source?: string;
	}>
): Promise<ThreatEvent[]> {
	const filteredResults = results.filter((result) => {
		const url = result.url.toLowerCase();
		if (BLOCKED_DOMAINS.some((domain) => url.includes(domain))) {
			return false;
		}
		const title = result.title;
		if (GENERIC_TITLE_PATTERNS.some((pattern) => pattern.test(title))) {
			return false;
		}
		return true;
	});

	const seenUrls = new Set<string>();
	const uniqueResults = filteredResults.filter((result) => {
		const normalizedUrl = result.url.split("?")[0].replace(/\/$/, "").toLowerCase();
		if (seenUrls.has(normalizedUrl)) return false;
		seenUrls.add(normalizedUrl);
		return true;
	});

	const eventsWithLocations = await Promise.all(
		uniqueResults.map(async (result) => {
			const cleanedTitle = cleanContent(result.title);
			const cleanedContent = cleanContent(result.content);
			const fullText = `${cleanedTitle} ${cleanedContent}`;

			const classification = await classifyEvent(cleanedTitle, cleanedContent);

			if (!classification.location || !isValidLocation(classification.location)) {
				return null;
			}

			const event: ThreatEvent = {
				id: generateEventId(),
				title: cleanedTitle,
				summary: cleanedContent.slice(0, 500),
				category: classification.category,
				threatLevel: classification.threatLevel,
				location: classification.location,
				timestamp: result.publishedDate || new Date().toISOString(),
				source: result.source || "web",
				sourceUrl: result.url,
				entities: extractEntities(fullText),
				keywords: extractKeywords(fullText),
				rawContent: cleanedContent
			};

			return event;
		})
	);

	const validEvents = eventsWithLocations.filter((event): event is ThreatEvent => event !== null);

	const uniqueEvents = validEvents.filter(
		(event, index, self) => index === self.findIndex((e) => e.title === event.title)
	);

	return uniqueEvents.sort((a, b) => {
		const priorityA = THREAT_LEVEL_PRIORITY[a.threatLevel] ?? 5;
		const priorityB = THREAT_LEVEL_PRIORITY[b.threatLevel] ?? 5;
		if (priorityA !== priorityB) {
			return priorityA - priorityB;
		}
		const dateA = new Date(a.timestamp).getTime();
		const dateB = new Date(b.timestamp).getTime();
		return dateB - dateA;
	});
}

export const GET: RequestHandler = async ({ url }) => {
	const query = url.searchParams.get("q");
	const accessToken = url.searchParams.get("accessToken");

	const selfHosted = isSelfHostedMode();
	if (!selfHosted && !accessToken) {
		return json({ error: "Authentication required", requiresReauth: true }, { status: 401 });
	}

	try {
		const searchQueries = query ? [query] : THREAT_QUERIES;
		const tokenToUse = selfHosted ? undefined : accessToken;

		const searchResultsArrays = await Promise.all(
			searchQueries.map((q) =>
				searchEvents(q, { maxResults: 20, accessToken: tokenToUse || undefined })
			)
		);

		const requiresReauth = searchResultsArrays.some((r) => r.requiresReauth);
		if (requiresReauth) {
			return json(
				{
					error: "auth_error",
					message: "Session expired. Please sign in again.",
					requiresReauth: true
				},
				{ status: 401 }
			);
		}

		const allResults = searchResultsArrays.flatMap((r) => r.results);
		const sortedEvents = await processSearchResults(allResults);

		return json({
			events: sortedEvents,
			count: sortedEvents.length,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error("Error fetching events:", error);
		return json({ error: "Failed to fetch events" }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { queries, accessToken } = body;

		const selfHosted = isSelfHostedMode();

		if (!selfHosted && !accessToken) {
			return json({ error: "Authentication required", requiresReauth: true }, { status: 401 });
		}

		const tokenToUse = selfHosted ? undefined : accessToken;

		const searchQueries =
			queries && Array.isArray(queries) && queries.length > 0
				? queries.slice(0, 12)
				: THREAT_QUERIES;

		const searchResultsArrays = await Promise.all(
			searchQueries.map((query: string) =>
				searchEvents(query, { maxResults: 20, accessToken: tokenToUse })
			)
		);

		const requiresReauth = searchResultsArrays.some((r) => r.requiresReauth);
		if (requiresReauth) {
			return json(
				{
					error: "auth_error",
					message: "Session expired. Please sign in again.",
					requiresReauth: true
				},
				{ status: 401 }
			);
		}

		const allResults = searchResultsArrays.flatMap((r) => r.results);
		const sortedEvents = await processSearchResults(allResults);

		return json({
			events: sortedEvents,
			count: sortedEvents.length,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error("Error fetching events:", error);
		return json({ error: "Failed to fetch events" }, { status: 500 });
	}
};
