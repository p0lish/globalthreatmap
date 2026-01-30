import { env } from "$env/dynamic/private";

export function isSelfHostedMode(): boolean {
	return env.APP_MODE !== "valyu";
}

export function isValyuMode(): boolean {
	return env.APP_MODE === "valyu";
}
