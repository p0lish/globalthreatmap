import { ChatCompletionMessageParam } from "openai/resources/index.mjs";

const Config: any = {
    diseasse: {
        category: [
            "epicemic",
            "pandemic",
            "outbreak",
            "news",
            "report",
            "update",
            "nipah"
        ],
        description: "The type of Nipah virus event:epicemic (widespread occurrence of an infectious disease in a community at a particular time), pandemic (an epidemic that has spread over multiple countries or continents, usually affecting a large number of people), outbreak (a sudden increase in occurrences of a disease in a particular time and place), news (general Nipah virus news), report (official reports on Nipah virus cases or outbreaks), update (latest updates on Nipah virus situation), nipah (any event specifically related to Nipah virus)",
        threatLevels: ["critical", "high", "medium", "low", "info"],
        threatDescription: "Severity level: critical (major outbreak, high mortality), high (confirmed cases spreading), medium (isolated cases, monitoring), low (contained/resolved), info (research updates, prevention info)",
        primaryLocation: "The main geographic location (city, region, or country) where the Nipah virus event is occurring. Use proper names.",
        city: "The city or town name if identifiable, null otherwise",
        region: "The state, province, or region if identifiable, null otherwise",
        country: "The country where the event is occurring, if identifiable but not the news location",
        agents: [{
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
        }
        ]
    },
}



export default Config;