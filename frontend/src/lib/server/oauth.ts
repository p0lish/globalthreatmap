/**
 * OAuth 2.0 with PKCE (Proof Key for Code Exchange) utilities
 * Server-side utilities for token exchange
 */

import { VALYU_CLIENT_ID, VALYU_CLIENT_SECRET, VALYU_AUTH_URL, REDIRECT_URI } from "./env";

/**
 * Base64 URL encoding (without padding)
 */
function base64URLEncode(buffer: Uint8Array): string {
	const base64 = btoa(String.fromCharCode(...buffer));
	return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

/**
 * Generates a random code verifier for PKCE
 */
export function generateCodeVerifier(): string {
	const array = new Uint8Array(32);
	crypto.getRandomValues(array);
	return base64URLEncode(array);
}

/**
 * Generates a code challenge from a code verifier
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);
	const hash = await crypto.subtle.digest("SHA-256", data);
	return base64URLEncode(new Uint8Array(hash));
}

/**
 * Check if OAuth is configured (server-side)
 */
export function isOAuthConfigured(): boolean {
	return !!(VALYU_CLIENT_ID && VALYU_AUTH_URL && REDIRECT_URI);
}

/**
 * Exchange authorization code for tokens (server-side)
 */
export async function exchangeCodeForTokens(
	code: string,
	codeVerifier: string
): Promise<{
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	token_type: string;
} | null> {
	if (!isOAuthConfigured()) {
		console.error("OAuth is not configured");
		return null;
	}

	try {
		const tokenUrl = new URL("/auth/v1/oauth/token", VALYU_AUTH_URL);

		const body = new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: REDIRECT_URI!,
			client_id: VALYU_CLIENT_ID!,
			code_verifier: codeVerifier
		});

		if (VALYU_CLIENT_SECRET) {
			body.append("client_secret", VALYU_CLIENT_SECRET);
		}

		const response = await fetch(tokenUrl.toString(), {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded"
			},
			body: body.toString()
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Token exchange failed:", response.status, errorText);
			return null;
		}

		return await response.json();
	} catch (error) {
		console.error("Token exchange error:", error);
		return null;
	}
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
	access_token: string;
	refresh_token?: string;
	expires_in: number;
	token_type: string;
} | null> {
	if (!isOAuthConfigured()) {
		console.error("OAuth is not configured");
		return null;
	}

	try {
		const tokenUrl = new URL("/auth/v1/oauth/token", VALYU_AUTH_URL);

		const body = new URLSearchParams({
			grant_type: "refresh_token",
			refresh_token: refreshToken,
			client_id: VALYU_CLIENT_ID!
		});

		if (VALYU_CLIENT_SECRET) {
			body.append("client_secret", VALYU_CLIENT_SECRET);
		}

		const response = await fetch(tokenUrl.toString(), {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded"
			},
			body: body.toString()
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error("Token refresh failed:", response.status, errorText);
			return null;
		}

		return await response.json();
	} catch (error) {
		console.error("Token refresh error:", error);
		return null;
	}
}

/**
 * User info interface
 */
export interface UserInfo {
	sub: string;
	email: string;
	email_verified: boolean;
	name?: string;
	picture?: string;
	updated_at?: string;
}

/**
 * Get user info from access token
 */
export async function getUserInfo(accessToken: string): Promise<UserInfo | null> {
	if (!VALYU_AUTH_URL) {
		return null;
	}

	try {
		const userInfoUrl = new URL("/auth/v1/userinfo", VALYU_AUTH_URL);

		const response = await fetch(userInfoUrl.toString(), {
			headers: {
				Authorization: `Bearer ${accessToken}`
			}
		});

		if (!response.ok) {
			return null;
		}

		return await response.json();
	} catch (error) {
		console.error("User info error:", error);
		return null;
	}
}
