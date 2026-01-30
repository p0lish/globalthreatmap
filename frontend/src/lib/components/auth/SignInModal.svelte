<script lang="ts">
	import { Dialog, DialogHeader, DialogTitle, DialogContent, Button } from '$lib/components/ui';
	import Loader2 from 'lucide-svelte/icons/loader-2';

	interface Props {
		open: boolean;
		onopenchange: (open: boolean) => void;
	}

	let { open, onopenchange }: Props = $props();

	let isLoading = $state(false);
	let error = $state<string | null>(null);

	// OAuth configuration check
	function isOAuthConfigured(): boolean {
		// Check if OAuth env vars are set
		return typeof window !== 'undefined';
	}

	async function initiateOAuthFlow() {
		// Redirect to OAuth provider
		const clientId = import.meta.env.VITE_VALYU_CLIENT_ID;
		const redirectUri = `${window.location.origin}/auth/callback`;
		const authUrl = new URL('https://auth.valyu.ai/authorize');

		// Generate PKCE code verifier and challenge
		const codeVerifier = generateCodeVerifier();
		const codeChallenge = await generateCodeChallenge(codeVerifier);

		// Store code verifier for later
		sessionStorage.setItem('oauth_code_verifier', codeVerifier);

		authUrl.searchParams.set('client_id', clientId);
		authUrl.searchParams.set('redirect_uri', redirectUri);
		authUrl.searchParams.set('response_type', 'code');
		authUrl.searchParams.set('code_challenge', codeChallenge);
		authUrl.searchParams.set('code_challenge_method', 'S256');

		window.location.href = authUrl.toString();
	}

	function generateCodeVerifier(): string {
		const array = new Uint8Array(32);
		crypto.getRandomValues(array);
		return btoa(String.fromCharCode(...array))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');
	}

	async function generateCodeChallenge(verifier: string): Promise<string> {
		const encoder = new TextEncoder();
		const data = encoder.encode(verifier);
		const digest = await crypto.subtle.digest('SHA-256', data);
		return btoa(String.fromCharCode(...new Uint8Array(digest)))
			.replace(/\+/g, '-')
			.replace(/\//g, '_')
			.replace(/=/g, '');
	}

	async function handleValyuSignIn() {
		isLoading = true;
		error = null;

		if (!isOAuthConfigured()) {
			error = 'OAuth is not configured. Please contact the administrator or use self-hosted mode.';
			isLoading = false;
			return;
		}

		try {
			await initiateOAuthFlow();
		} catch (err) {
			console.error('OAuth initiation error:', err);
			error = 'Failed to initiate sign in. Please try again.';
			isLoading = false;
		}
	}

	function handleClose() {
		if (!isLoading) {
			error = null;
			onopenchange(false);
		}
	}
</script>

<Dialog {open} onclose={handleClose} class="max-w-md">
	<DialogHeader onclose={handleClose}>
		<DialogTitle class="text-center text-xl">Sign in</DialogTitle>
	</DialogHeader>
	<DialogContent class="space-y-6">
		<p class="text-center text-sm text-muted-foreground">Sign in to access all features.</p>

		<p class="text-center text-sm text-muted-foreground">
			Valyu is the intelligence layer of GTM. It gives access to real-time web search, financial,
			academic, medical research and proprietary data sources.
		</p>

		{#if error}
			<div class="rounded-lg bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
				{error}
			</div>
		{/if}

		<Button onclick={handleValyuSignIn} disabled={isLoading} class="w-full h-12">
			{#if isLoading}
				<Loader2 class="h-5 w-5 animate-spin mr-2" />
				Redirecting to Valyu...
			{:else}
				<span class="mr-2">Sign in with</span>
				<span class="flex items-center gap-2">
					<svg
						viewBox="0 0 24 24"
						fill="none"
						class="h-5 w-5"
						stroke="currentColor"
						stroke-width="2.5"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M12 20L4 4h16L12 20z" />
					</svg>
					<span class="font-semibold tracking-wide">VALYU</span>
				</span>
			{/if}
		</Button>

		<p class="text-center text-sm text-muted-foreground">
			Don't have an account? You can create one during sign-in.
		</p>
	</DialogContent>
</Dialog>
