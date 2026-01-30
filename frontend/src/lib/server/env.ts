// Server-side environment variables
// These are accessed via $env/static/private in SvelteKit

import { env } from "$env/dynamic/private";

export const VALYU_API_KEY = env.VALYU_API_KEY;
export const VALYU_APP_URL = env.VALYU_APP_URL || "https://platform.valyu.ai";
export const VALYU_OAUTH_PROXY_URL = env.VALYU_OAUTH_PROXY_URL || `${VALYU_APP_URL}/api/oauth/proxy`;

export const OPENAI_API_KEY = env.OPENAI_API_KEY;
export const OPENAI_MODEL = env.OPENAI_MODEL || "gpt-4.1-nano";

export const MAPBOX_TOKEN = env.MAPBOX_TOKEN;

// OAuth configuration
export const VALYU_CLIENT_ID = env.VALYU_CLIENT_ID;
export const VALYU_CLIENT_SECRET = env.VALYU_CLIENT_SECRET;
export const VALYU_AUTH_URL = env.VALYU_AUTH_URL;
export const REDIRECT_URI = env.REDIRECT_URI;
