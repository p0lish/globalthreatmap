import { json, type RequestHandler } from "@sveltejs/kit";
import { getCountryNipahCases, streamCountryNipahCases } from "$lib/server/valyu";
import { isSelfHostedMode } from "$lib/server/app-mode";

export const GET: RequestHandler = async ({ url }) => {
	const country = url.searchParams.get("country");
	const stream = url.searchParams.get("stream") === "true";
	const accessToken = url.searchParams.get("accessToken");

	if (!country) {
		return json({ error: "Country parameter is required" }, { status: 400 });
	}

	const selfHosted = isSelfHostedMode();
	if (!selfHosted && !accessToken) {
		return json({ error: "Authentication required", requiresReauth: true }, { status: 401 });
	}

	// Streaming mode - use Server-Sent Events
	if (stream) {
		const encoder = new TextEncoder();

		const readable = new ReadableStream({
			async start(controller) {
				try {
					for await (const chunk of streamCountryNipahCases(country)) {
						const data = `data: ${JSON.stringify(chunk)}\n\n`;
						controller.enqueue(encoder.encode(data));
					}
					controller.close();
				} catch (error) {
					const errorData = `data: ${JSON.stringify({
						type: "error",
						error: error instanceof Error ? error.message : "Unknown error"
					})}\n\n`;
					controller.enqueue(encoder.encode(errorData));
					controller.close();
				}
			}
		});

		return new Response(readable, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive"
			}
		});
	}

	// Non-streaming mode
	try {
		const result = await getCountryNipahCases(country);

		return json({
			country,
			past: {
				cases: result.past.summary,
				sources: result.past.sources
			},
			current: {
				cases: result.current.summary,
				sources: result.current.sources
			},
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error("Error fetching country Nipah cases:", error);
		return json({ error: "Failed to fetch country Nipah cases" }, { status: 500 });
	}
};
