import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

const TOKEN_STORAGE_KEY = 'valyu_oauth_tokens';
const USER_STORAGE_KEY = 'valyu_user';

export interface User {
	id: string;
	name: string;
	email: string;
	picture?: string;
	email_verified?: boolean;
}

interface TokenData {
	accessToken: string;
	refreshToken?: string;
	expiresAt: number;
}

// Helper functions for localStorage
function saveTokens(tokens: TokenData): void {
	if (!browser) return;
	localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(tokens));
}

function loadTokens(): TokenData | null {
	if (!browser) return null;
	try {
		const stored = localStorage.getItem(TOKEN_STORAGE_KEY);
		if (!stored) return null;
		return JSON.parse(stored);
	} catch {
		return null;
	}
}

function clearTokens(): void {
	if (!browser) return;
	localStorage.removeItem(TOKEN_STORAGE_KEY);
}

function saveUser(user: User): void {
	if (!browser) return;
	localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
}

function loadUser(): User | null {
	if (!browser) return null;
	try {
		const stored = localStorage.getItem(USER_STORAGE_KEY);
		if (!stored) return null;
		return JSON.parse(stored);
	} catch {
		return null;
	}
}

function clearUser(): void {
	if (!browser) return;
	localStorage.removeItem(USER_STORAGE_KEY);
}

// Check if token is expired (with 30s buffer)
function isTokenExpired(expiresAt: number): boolean {
	return Date.now() >= expiresAt - 30000;
}

// Load initial state from localStorage
function loadInitialState() {
	if (!browser) {
		return {
			user: null,
			accessToken: null,
			refreshToken: null,
			tokenExpiresAt: null,
			isAuthenticated: false,
			isLoading: false,
			initialized: false
		};
	}

	const user = loadUser();
	const tokens = loadTokens();

	if (user && tokens && !isTokenExpired(tokens.expiresAt)) {
		return {
			user,
			accessToken: tokens.accessToken,
			refreshToken: tokens.refreshToken || null,
			tokenExpiresAt: tokens.expiresAt,
			isAuthenticated: true,
			isLoading: false,
			initialized: true
		};
	}

	return {
		user: null,
		accessToken: null,
		refreshToken: null,
		tokenExpiresAt: null,
		isAuthenticated: false,
		isLoading: false,
		initialized: true
	};
}

// Create stores
const authState = writable(loadInitialState());

// Derived stores for convenience
export const user = derived(authState, ($state) => $state.user);
export const isAuthenticated = derived(authState, ($state) => $state.isAuthenticated);
export const isLoading = derived(authState, ($state) => $state.isLoading);
export const initialized = derived(authState, ($state) => $state.initialized);

// Auth actions
export function initialize() {
	const state = get(authState);
	if (state.initialized) return;

	const initialState = loadInitialState();
	authState.set({ ...initialState, initialized: true });
}

export function signIn(
	user: User,
	tokens: { accessToken: string; refreshToken?: string; expiresIn?: number }
) {
	// Default to 7 days if no expiresIn provided
	const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
	const expiresAt = tokens.expiresIn
		? Date.now() + tokens.expiresIn * 1000
		: Date.now() + SEVEN_DAYS_MS;

	// Save to localStorage
	saveUser(user);
	saveTokens({
		accessToken: tokens.accessToken,
		refreshToken: tokens.refreshToken,
		expiresAt
	});

	// Update state
	authState.set({
		user,
		accessToken: tokens.accessToken,
		refreshToken: tokens.refreshToken || null,
		tokenExpiresAt: expiresAt,
		isAuthenticated: true,
		isLoading: false,
		initialized: true
	});
}

export function signOut() {
	clearUser();
	clearTokens();

	authState.set({
		user: null,
		accessToken: null,
		refreshToken: null,
		tokenExpiresAt: null,
		isAuthenticated: false,
		isLoading: false,
		initialized: true
	});
}

export function getAccessToken(): string | null {
	const state = get(authState);
	if (!state.accessToken) return null;

	if (state.tokenExpiresAt && isTokenExpired(state.tokenExpiresAt)) {
		return null;
	}

	return state.accessToken;
}
