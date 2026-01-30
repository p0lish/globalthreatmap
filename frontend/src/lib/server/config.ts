import type { ChatCompletionMessageParam } from "openai/resources/index.mjs";

interface DiseaseConfig {
	category: readonly string[];
	description: string;
	threatLevels: readonly string[];
	threatDescription: string;
	primaryLocation: string;
	city: string;
	region: string;
	country: string;
	agents: ChatCompletionMessageParam[];
}

interface Config {
	diseasse: DiseaseConfig;
}

const Config: Config = {
	diseasse: {
		category: ["epicemic", "pandemic", "outbreak", "news", "report", "update", "nipah"] as const,
		description:
			"The type of Nipah virus event:epicemic (widespread occurrence of an infectious disease in a community at a particular time), pandemic (an epidemic that has spread over multiple countries or continents, usually affecting a large number of people), outbreak (a sudden increase in occurrences of a disease in a particular time and place), news (general Nipah virus news), report (official reports on Nipah virus cases or outbreaks), update (latest updates on Nipah virus situation), nipah (any event specifically related to Nipah virus)",
		threatLevels: ["critical", "high", "medium", "low", "info"] as const,
		threatDescription:
			"Severity level: critical (major outbreak, high mortality), high (confirmed cases spreading), medium (isolated cases, monitoring), low (contained/resolved), info (research updates, prevention info)",
		primaryLocation:
			"The SPECIFIC city or town mentioned in the news where the Nipah virus event is occurring. Extract the most specific geographic location from the article content, preferring cities over broader regions. Use proper names.",
		city: "The EXACT city or town name mentioned in the news content (not the news source location). This is critical - extract the city from the article text itself.",
		region:
			"The state, province, or region if mentioned in the article content, null otherwise",
		country:
			"The country where the event is mentioned in the article content (extracted from the news text, NOT the news source location)",
		agents: [
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
                    3. Location - CRITICAL: Extract the SPECIFIC CITY/TOWN mentioned in the article content where the event is happening

                    LOCATION EXTRACTION PRIORITY:
                    - ALWAYS prioritize extracting the specific city or town name from the article text
                    - Look for phrases like "in [city]", "at [city]", "[city] reported", etc.
                    - Extract the location from the NEWS CONTENT, NOT from where the news source is based
                    - If a city is mentioned, use that as the primaryLocation
                    - Only use broader regions/countries if no specific city is mentioned

                    For threat level:
                    - critical: major outbreak with high mortality, rapid spread, multiple deaths
                    - high: confirmed Nipah cases with active transmission, deaths reported
                    - medium: isolated cases under monitoring, limited transmission
                    - low: contained or resolved cases, no active spread
                    - info: research updates, prevention information, historical context`
			}
		]
	}
};

export default Config;
