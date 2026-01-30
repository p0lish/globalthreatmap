import { json, type RequestHandler } from "@sveltejs/kit";
import { VALYU_AUTH_URL, REDIRECT_URI, VALYU_CLIENT_ID, VALYU_CLIENT_SECRET, VALYU_APP_URL } from "$lib/server/env";

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { code, codeVerifier } = await request.json();

		if (!code || !codeVerifier) {
			return json({ error: "Missing required parameters" }, { status: 400 });
		}

		// Exchange authorization code for access token
		const tokenResponse = await fetch(`${VALYU_AUTH_URL}/auth/v1/oauth/token`, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded"
			},
			body: new URLSearchParams({
				grant_type: "authorization_code",
				code,
				redirect_uri: REDIRECT_URI!,
				client_id: VALYU_CLIENT_ID!,
				client_secret: VALYU_CLIENT_SECRET!,
				code_verifier: codeVerifier
			})
		});

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.text();
			console.error("Token exchange failed:", errorData);
			return json(
				{ error: "Token exchange failed", details: errorData },
				{ status: tokenResponse.status }
			);
		}

		const tokenData = await tokenResponse.json();
		const { access_token, refresh_token, expires_in } = tokenData;

		// Get user info from Valyu platform
		const userInfoResponse = await fetch(`${VALYU_APP_URL}/api/oauth/userinfo`, {
			headers: {
				Authorization: `Bearer ${access_token}`
			}
		});

		if (!userInfoResponse.ok) {
			console.error("Failed to get user info");
			return json({ error: "Failed to get user info" }, { status: userInfoResponse.status });
		}

		const userInfo = await userInfoResponse.json();

		return json({
			access_token,
			refresh_token,
			expires_in,
			user: {
				id: userInfo.sub,
				email: userInfo.email,
				name: userInfo.name,
				picture: userInfo.picture,
				email_verified: userInfo.email_verified
			}
		});
	} catch (error) {
		console.error("Token exchange error:", error);
		return json(
			{
				error: "Internal server error",
				details: error instanceof Error ? error.message : "Unknown error"
			},
			{ status: 500 }
		);
	}
};
