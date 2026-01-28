import { Valyu } from "valyu-js";

let valyuInstance: Valyu | null = null;

const OAUTH_PROXY_URL =
  process.env.VALYU_OAUTH_PROXY_URL ||
  `${process.env.VALYU_APP_URL || "https://platform.valyu.ai"}/api/oauth/proxy`;

function getValyuClient(): Valyu {
  if (!valyuInstance) {
    const apiKey = process.env.VALYU_API_KEY;
    if (!apiKey) {
      throw new Error("VALYU_API_KEY environment variable is not set");
    }
    valyuInstance = new Valyu(apiKey);
  }
  return valyuInstance;
}

interface ProxyResult {
  success: boolean;
  data?: any;
  error?: string;
  requiresReauth?: boolean;
}

async function callViaProxy(
  path: string,
  body: any,
  accessToken: string
): Promise<ProxyResult> {
  try {
    const response = await fetch(OAUTH_PROXY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ path, method: "POST", body }),
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "Session expired", requiresReauth: true };
      }
      return { success: false, error: `API call failed: ${response.status}` };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

function parsePublishedDate(dateValue: unknown): string | undefined {
  if (!dateValue) return undefined;

  if (typeof dateValue === "string") {
    const parsed = new Date(dateValue);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
    return dateValue.toISOString();
  }

  if (typeof dateValue === "number") {
    const timestamp = dateValue > 1e12 ? dateValue : dateValue * 1000;
    const parsed = new Date(timestamp);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
  }

  return undefined;
}

interface SearchOptions {
  maxResults?: number;
  freshness?: "day" | "week" | "month";
  accessToken?: string;
}

export async function searchEvents(
  query: string,
  options?: SearchOptions
): Promise<{
  results: Array<{
    title: string;
    url: string;
    content: string;
    publishedDate?: string;
    source?: string;
  }>;
  requiresReauth?: boolean;
}> {
  const searchBody = {
    query,
    searchType: "news",
    maxNumResults: options?.maxResults || 20,
  };

  if (options?.accessToken) {
    const proxyResult = await callViaProxy("/v1/search", searchBody, options.accessToken);

    if (!proxyResult.success) {
      if (proxyResult.requiresReauth) {
        return { results: [], requiresReauth: true };
      }
      throw new Error(proxyResult.error || "Search failed");
    }

    const response = proxyResult.data;
    if (!response.results) {
      return { results: [] };
    }

    return {
      results: response.results.map((result: any) => {
        const dateValue = result.date || result.publication_date;
        return {
          title: result.title || "Untitled",
          url: result.url || "",
          content: typeof result.content === "string" ? result.content : "",
          publishedDate: parsePublishedDate(dateValue),
          source: result.source,
        };
      }),
    };
  }

  try {
    const valyu = getValyuClient();
    const response = await valyu.search(query, {
      searchType: "news",
      maxNumResults: options?.maxResults || 20,
    });

    if (!response.results) {
      return { results: [] };
    }

    return {
      results: response.results.map((result) => {
        const dateValue = result.date || result.publication_date;
        return {
          title: result.title || "Untitled",
          url: result.url || "",
          content: typeof result.content === "string" ? result.content : "",
          publishedDate: parsePublishedDate(dateValue),
          source: result.source,
        };
      }),
    };
  } catch (error) {
    console.error("Search error:", error);
    throw error;
  }
}

type EntityType = "organization" | "person" | "country" | "group";

const COUNTRIES = new Set([
  "afghanistan", "albania", "algeria", "andorra", "angola", "argentina", "armenia",
  "australia", "austria", "azerbaijan", "bahamas", "bahrain", "bangladesh", "barbados",
  "belarus", "belgium", "belize", "benin", "bhutan", "bolivia", "bosnia", "botswana",
  "brazil", "brunei", "bulgaria", "burkina faso", "burundi", "cambodia", "cameroon",
  "canada", "cape verde", "central african republic", "chad", "chile", "china",
  "colombia", "comoros", "congo", "costa rica", "croatia", "cuba", "cyprus",
  "czech republic", "czechia", "denmark", "djibouti", "dominica", "dominican republic",
  "ecuador", "egypt", "el salvador", "equatorial guinea", "eritrea", "estonia",
  "eswatini", "ethiopia", "fiji", "finland", "france", "gabon", "gambia", "georgia",
  "germany", "ghana", "greece", "grenada", "guatemala", "guinea", "guinea-bissau",
  "guyana", "haiti", "honduras", "hungary", "iceland", "india", "indonesia", "iran",
  "iraq", "ireland", "israel", "italy", "ivory coast", "jamaica", "japan", "jordan",
  "kazakhstan", "kenya", "kiribati", "north korea", "south korea", "korea", "kosovo",
  "kuwait", "kyrgyzstan", "laos", "latvia", "lebanon", "lesotho", "liberia", "libya",
  "liechtenstein", "lithuania", "luxembourg", "madagascar", "malawi", "malaysia",
  "maldives", "mali", "malta", "marshall islands", "mauritania", "mauritius", "mexico",
  "micronesia", "moldova", "monaco", "mongolia", "montenegro", "morocco", "mozambique",
  "myanmar", "namibia", "nauru", "nepal", "netherlands", "new zealand", "nicaragua",
  "niger", "nigeria", "north macedonia", "norway", "oman", "pakistan", "palau",
  "palestine", "panama", "papua new guinea", "paraguay", "peru", "philippines", "poland",
  "portugal", "qatar", "romania", "russia", "rwanda", "saint kitts", "saint lucia",
  "saint vincent", "samoa", "san marino", "saudi arabia", "senegal", "serbia",
  "seychelles", "sierra leone", "singapore", "slovakia", "slovenia", "solomon islands",
  "somalia", "south africa", "south sudan", "spain", "sri lanka", "sudan", "suriname",
  "sweden", "switzerland", "syria", "taiwan", "tajikistan", "tanzania", "thailand",
  "timor-leste", "togo", "tonga", "trinidad", "tunisia", "turkey", "turkmenistan",
  "tuvalu", "uganda", "ukraine", "united arab emirates", "uae", "united kingdom", "uk",
  "united states", "usa", "us", "america", "uruguay", "uzbekistan", "vanuatu",
  "vatican", "venezuela", "vietnam", "yemen", "zambia", "zimbabwe",
]);

function classifyEntityType(name: string, content: string): EntityType {
  const lowerName = name.toLowerCase().trim();
  const lowerContent = content.toLowerCase();

  if (COUNTRIES.has(lowerName)) {
    return "country";
  }

  const countryIndicators = [
    "sovereign nation", "republic of", "kingdom of", "nation state",
    "government of", "country located", "bordered by", "capital city",
    "national anthem", "head of state", "prime minister of", "president of the country",
  ];
  const countryScore = countryIndicators.filter(ind => lowerContent.includes(ind)).length;

  const groupIndicators = [
    "ethnic group", "tribe", "tribal", "indigenous", "clan", "community",
    "peoples", "militant group", "rebel group", "armed group", "terrorist organization",
    "militia", "faction", "insurgent", "separatist", "guerrilla",
  ];
  const groupScore = groupIndicators.filter(ind => lowerContent.includes(ind)).length;

  const personIndicators = [
    "was born", "born in", "died in", "biography", "personal life",
    "early life", "career", "married", "children", "his ", "her ",
    "he was", "she was", "politician", "leader", "ceo", "founder",
    "president ", "minister ", "general ", "commander",
  ];
  const personScore = personIndicators.filter(ind => lowerContent.includes(ind)).length;

  const orgIndicators = [
    "company", "corporation", "founded in", "headquarters", "inc.", "ltd.",
    "organization", "institution", "agency", "association", "foundation",
    "ngo", "nonprofit", "enterprise", "business", "firm", "conglomerate",
  ];
  const orgScore = orgIndicators.filter(ind => lowerContent.includes(ind)).length;

  const scores = [
    { type: "country" as EntityType, score: countryScore * 2 },
    { type: "group" as EntityType, score: groupScore * 1.5 },
    { type: "person" as EntityType, score: personScore },
    { type: "organization" as EntityType, score: orgScore },
  ];

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score > 0) {
    return scores[0].type;
  }

  return "organization";
}

interface EntityOptions {
  accessToken?: string;
}

export async function getEntityResearch(entityName: string, options?: EntityOptions) {
  const searchBody = {
    query: `${entityName} profile background information`,
    searchType: "all",
    maxNumResults: 10,
  };

  if (options?.accessToken) {
    const proxyResult = await callViaProxy("/v1/search", searchBody, options.accessToken);

    if (!proxyResult.success) {
      if (proxyResult.requiresReauth) {
        return null;
      }
      throw new Error(proxyResult.error || "Entity research failed");
    }

    const response = proxyResult.data;
    if (!response.results || response.results.length === 0) {
      return null;
    }

    const combinedContent = response.results
      .map((r: any) => (typeof r.content === "string" ? r.content : ""))
      .join("\n\n");

    const entityType = classifyEntityType(entityName, combinedContent);

    return {
      name: entityName,
      description: combinedContent.slice(0, 1000),
      type: entityType,
      data: {
        sources: response.results.map((r: any) => ({
          title: r.title,
          url: r.url,
        })),
      },
    };
  }

  try {
    const valyu = getValyuClient();
    const response = await valyu.search(
      `${entityName} profile background information`,
      {
        searchType: "all",
        maxNumResults: 10,
      }
    );

    if (!response.results || response.results.length === 0) {
      return null;
    }

    const combinedContent = response.results
      .map((r) => (typeof r.content === "string" ? r.content : ""))
      .join("\n\n");

    const entityType = classifyEntityType(entityName, combinedContent);

    return {
      name: entityName,
      description: combinedContent.slice(0, 1000),
      type: entityType,
      data: {
        sources: response.results.map((r) => ({
          title: r.title,
          url: r.url,
        })),
      },
    };
  } catch (error) {
    console.error("Entity research error:", error);
    throw error;
  }
}

export async function searchEntityLocations(entityName: string, options?: EntityOptions) {
  const searchBody = {
    query: `${entityName} headquarters offices locations branches worldwide operations`,
    searchType: "all",
    maxNumResults: 15,
  };

  if (options?.accessToken) {
    const proxyResult = await callViaProxy("/v1/search", searchBody, options.accessToken);

    if (!proxyResult.success) {
      return "";
    }

    const response = proxyResult.data;
    if (!response.results || response.results.length === 0) {
      return "";
    }

    return response.results
      .map((r: any) => (typeof r.content === "string" ? r.content : ""))
      .join("\n\n");
  }

  try {
    const valyu = getValyuClient();
    const response = await valyu.search(
      `${entityName} headquarters offices locations branches worldwide operations`,
      {
        searchType: "all",
        maxNumResults: 15,
      }
    );

    if (!response.results || response.results.length === 0) {
      return "";
    }

    return response.results
      .map((r) => (typeof r.content === "string" ? r.content : ""))
      .join("\n\n");
  } catch (error) {
    console.error("Entity locations error:", error);
    return "";
  }
}

export async function deepResearch(
  topic: string,
  options?: EntityOptions
): Promise<{ summary: string; sources: { title: string; url: string }[] }> {
  const searchBody = {
    query: `comprehensive analysis: ${topic}`,
    searchType: "all",
    maxNumResults: 30,
  };

  if (options?.accessToken) {
    const proxyResult = await callViaProxy("/v1/search", searchBody, options.accessToken);

    if (!proxyResult.success) {
      return { summary: "Research failed. Please try again.", sources: [] };
    }

    const response = proxyResult.data;
    if (!response.results) {
      return { summary: "No research results found.", sources: [] };
    }

    const summary = response.results
      .slice(0, 10)
      .map((r: any) => (typeof r.content === "string" ? r.content : ""))
      .join("\n\n")
      .slice(0, 3000);

    const sources = response.results.map((r: any) => ({
      title: r.title || "Untitled",
      url: r.url || "",
    }));

    return { summary, sources };
  }

  try {
    const valyu = getValyuClient();
    const response = await valyu.search(`comprehensive analysis: ${topic}`, {
      searchType: "all",
      maxNumResults: 30,
    });

    if (!response.results) {
      return { summary: "No research results found.", sources: [] };
    }

    const summary = response.results
      .slice(0, 10)
      .map((r) => (typeof r.content === "string" ? r.content : ""))
      .join("\n\n")
      .slice(0, 3000);

    const sources = response.results.map((r) => ({
      title: r.title || "Untitled",
      url: r.url || "",
    }));

    return { summary, sources };
  } catch (error) {
    console.error("Deep research error:", error);
    throw error;
  }
}

interface HospitalCaseInfo {
  summary: string;
  sources: { title: string; url: string }[];
}

export interface NipahHospital {
  country: string;
  hospitalName: string;
  city: string;
  latitude: number;
  longitude: number;
  caseCount?: number;
  lastReported?: string;
  status: "active" | "contained" | "monitoring";
}

export async function getNipahHospitals(): Promise<NipahHospital[]> {
  const valyu = getValyuClient();

  type AnswerResponse = {
    contents?: string;
    search_results?: Array<{ title?: string; url?: string }>;
  };

  const response = await valyu.answer(
    `List all hospitals and medical facilities that have reported Nipah virus cases in recent years (2018-2026). For each facility, provide the country, city, hospital name, and current status (active cases, contained, or under monitoring). Format each entry as: Country | City | Hospital Name | Status`,
    {
      excludedSources: ["wikipedia.org"],
    }
  );

  const answerData = response as AnswerResponse;
  const content = answerData.contents || "";

  const hospitals: NipahHospital[] = [];
  const lines = content.split("\n");

  const cityCoordinates: Record<string, { lat: number; lng: number; country: string }> = {
    // Kerala, India - historical Nipah outbreak locations
    "Kozhikode": { lat: 11.2588, lng: 75.7804, country: "India" },
    "Malappuram": { lat: 11.0510, lng: 76.0711, country: "India" },
    "Ernakulam": { lat: 9.9816, lng: 76.2999, country: "India" },
    "Kannur": { lat: 11.8745, lng: 75.3704, country: "India" },
    "Thrissur": { lat: 10.5276, lng: 76.2144, country: "India" },
    "Kochi": { lat: 9.9312, lng: 76.2673, country: "India" },

    // Bangladesh - Nipah outbreak locations
    "Dhaka": { lat: 23.8103, lng: 90.4125, country: "Bangladesh" },
    "Rajbari": { lat: 23.7574, lng: 89.6444, country: "Bangladesh" },
    "Faridpur": { lat: 23.6070, lng: 89.8429, country: "Bangladesh" },
    "Naogaon": { lat: 24.7936, lng: 88.9318, country: "Bangladesh" },
    "Tangail": { lat: 24.2513, lng: 89.9167, country: "Bangladesh" },
    "Manikganj": { lat: 23.8617, lng: 90.0003, country: "Bangladesh" },
    "Rajshahi": { lat: 24.3745, lng: 88.6042, country: "Bangladesh" },

    // Other potential locations
    "Singapore": { lat: 1.3521, lng: 103.8198, country: "Singapore" },
    "Siliguri": { lat: 26.7271, lng: 88.3953, country: "India" },
    "Silchar": { lat: 24.8333, lng: 92.7789, country: "India" },
    "Guwahati": { lat: 26.1445, lng: 91.7362, country: "India" },
  };

  for (const line of lines) {
    const parts = line.split("|").map((p) => p.trim());
    if (parts.length >= 3) {
      const countryName = parts[0].replace(/^[-*•\d.)\s]+/, "").trim();
      const cityName = parts[1] || "Unknown";
      const hospitalName = parts[2] || "Medical Facility";
      const statusStr = (parts[3] || "monitoring").toLowerCase();

      let status: "active" | "contained" | "monitoring" = "monitoring";
      if (statusStr.includes("active")) status = "active";
      else if (statusStr.includes("contained") || statusStr.includes("resolved")) status = "contained";

      const coords = cityCoordinates[cityName];
      if (coords) {
        hospitals.push({
          country: countryName,
          city: cityName,
          hospitalName,
          latitude: coords.lat,
          longitude: coords.lng,
          status,
        });
      }
    }
  }

  // Fallback data with known Nipah outbreak hospitals
  if (hospitals.length < 3) {
    return [
    ];
  }

  return hospitals;
}

export async function getCountryNipahCases(
  country: string,
  options?: EntityOptions
): Promise<{ past: HospitalCaseInfo; current: HospitalCaseInfo }> {
  const valyu = getValyuClient();

  type AnswerResponse = {
    contents?: string;
    search_results?: Array<{ title?: string; url?: string }>;
  };

  const [pastResponse, currentResponse] = await Promise.all([
    valyu.answer(
      `List all historical Nipah virus outbreaks and cases in ${country} from 1998 to 2023. Include the year, location, number of cases, deaths, and hospitals involved. Focus on past outbreaks that have been resolved.`,
      {
        excludedSources: ["wikipedia.org"],
      }
    ),
    valyu.answer(
      `List all current or recent Nipah virus cases, outbreaks, and monitoring activities in ${country} as of 2024-2026. Include active cases, hospitals treating patients, containment measures, and surveillance programs. If there are no current cases, state that clearly.`,
      {
        excludedSources: ["wikipedia.org"],
      }
    ),
  ]);

  const pastData = pastResponse as AnswerResponse;
  const currentData = currentResponse as AnswerResponse;

  return {
    past: {
      summary: pastData.contents || "No historical Nipah virus case information found.",
      sources: (pastData.search_results || []).map((s) => ({
        title: s.title || "Source",
        url: s.url || "",
      })),
    },
    current: {
      summary: currentData.contents || "No current Nipah virus case information found.",
      sources: (currentData.search_results || []).map((s) => ({
        title: s.title || "Source",
        url: s.url || "",
      })),
    },
  };
}

export type NipahCaseStreamChunk = {
  type: "current_content" | "current_sources" | "past_content" | "past_sources" | "done" | "error";
  content?: string;
  sources?: Array<{ title: string; url: string }>;
  error?: string;
};

export async function* streamCountryNipahCases(
  country: string
): AsyncGenerator<NipahCaseStreamChunk> {
  const valyu = getValyuClient();

  const currentQuery = `List all current or recent Nipah virus cases, outbreaks, and monitoring activities only from ${country} from the past months. Include active cases, hospitals treating patients, containment measures, and surveillance programs. If there are no current cases, state that clearly.`;

  const pastQuery = `List all historical Nipah virus outbreaks and cases only from ${country} between 2000 and 2023. Include the year, location, number of cases, deaths, and hospitals involved. Focus on past outbreaks that have been resolved.`;

  try {
    const currentStream = await valyu.answer(currentQuery, {
      excludedSources: ["wikipedia.org"],
      streaming: true,
    });

    if (Symbol.asyncIterator in (currentStream as object)) {
      for await (const chunk of currentStream as AsyncGenerator<{
        type: string;
        content?: string;
        search_results?: Array<{ title?: string; url?: string }>;
      }>) {
        if (chunk.type === "content" && chunk.content) {
          yield { type: "current_content", content: chunk.content };
        } else if (chunk.type === "search_results" && chunk.search_results) {
          yield {
            type: "current_sources",
            sources: chunk.search_results.map((s) => ({
              title: s.title || "Source",
              url: s.url || "",
            })),
          };
        }
      }
    }

    const pastStream = await valyu.answer(pastQuery, {
      excludedSources: ["wikipedia.org"],
      streaming: true,
    });

    if (Symbol.asyncIterator in (pastStream as object)) {
      for await (const chunk of pastStream as AsyncGenerator<{
        type: string;
        content?: string;
        search_results?: Array<{ title?: string; url?: string }>;
      }>) {
        if (chunk.type === "content" && chunk.content) {
          yield { type: "past_content", content: chunk.content };
        } else if (chunk.type === "search_results" && chunk.search_results) {
          yield {
            type: "past_sources",
            sources: chunk.search_results.map((s) => ({
              title: s.title || "Source",
              url: s.url || "",
            })),
          };
        }
      }
    }

    yield { type: "done" };
  } catch (error) {
    yield {
      type: "error",
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}
