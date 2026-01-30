import { json, type RequestHandler } from "@sveltejs/kit";
import { Valyu } from "valyu-js";
import { isSelfHostedMode } from "$lib/server/app-mode";
import { VALYU_API_KEY, VALYU_OAUTH_PROXY_URL } from "$lib/server/env";

let valyuInstance: Valyu | null = null;

function getValyuClient(): Valyu {
	if (!valyuInstance) {
		if (!VALYU_API_KEY) {
			throw new Error("VALYU_API_KEY environment variable is not set");
		}
		valyuInstance = new Valyu(VALYU_API_KEY);
	}
	return valyuInstance;
}

async function getStatusViaProxy(taskId: string, accessToken: string): Promise<any> {
	try {
		const response = await fetch(VALYU_OAUTH_PROXY_URL, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				"Content-Type": "application/json"
			},
			body: JSON.stringify({
				path: `/v1/deepresearch/tasks/${taskId}/status`,
				method: "GET"
			})
		});

		if (!response.ok) {
			if (response.status === 401 || response.status === 403) {
				return { error: "Session expired. Please sign in again." };
			}
			return { error: `API call failed: ${response.status}` };
		}

		return await response.json();
	} catch (error) {
		return { error: error instanceof Error ? error.message : "Unknown error" };
	}
}

export const GET: RequestHandler = async ({ params, url }) => {
	try {
		const { taskId } = params;
		const accessToken = url.searchParams.get("accessToken");

		if (!taskId) {
			return json({ error: "Task ID is required" }, { status: 400 });
		}

		const selfHosted = isSelfHostedMode();
		let statusData: any;

		if (!selfHosted && !accessToken) {
			return json({ error: "Authentication required", requiresReauth: true }, { status: 401 });
		}

		// Use OAuth proxy in valyu mode
		if (!selfHosted && accessToken) {
			statusData = await getStatusViaProxy(taskId, accessToken);
			if (statusData.error) {
				return json({ error: statusData.error }, { status: 500 });
			}
		} else {
			// Self-hosted mode: use API key directly
			const valyu = getValyuClient();
			statusData = await valyu.deepresearch.status(taskId);

			if (!statusData.success) {
				return json({ error: statusData.error || "Failed to get task status" }, { status: 500 });
			}
		}

		const response: {
			taskId: string;
			status: string;
			progress?: { currentStep: number; totalSteps: number };
			output?: string;
			sources?: Array<{ title: string; url: string }>;
			deliverables?: Array<{
				type: string;
				title: string;
				url: string;
				status: string;
			}>;
			pdfUrl?: string;
			error?: string;
		} = {
			taskId,
			status: statusData.status || "unknown"
		};

		if (statusData.progress) {
			response.progress = {
				currentStep: statusData.progress.current_step,
				totalSteps: statusData.progress.total_steps
			};
		}

		if (statusData.status === "completed") {
			response.output =
				typeof statusData.output === "string"
					? statusData.output
					: JSON.stringify(statusData.output);

			response.sources = (statusData.sources || []).map((s: any) => ({
				title: s.title || "Source",
				url: s.url || ""
			}));

			response.pdfUrl = statusData.pdf_url;

			if (statusData.deliverables) {
				response.deliverables = statusData.deliverables.map((d: any) => ({
					type: d.type,
					title: d.title,
					url: d.url,
					status: d.status
				}));
			}
		}

		if (statusData.status === "failed") {
			response.error = statusData.error;
		}

		return json(response);
	} catch (error) {
		console.error("Error checking deep research status:", error);
		return json({ error: "Failed to check task status" }, { status: 500 });
	}
};
