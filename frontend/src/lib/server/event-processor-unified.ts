/**
 * Unified event processor that automatically selects the best available AI backend
 * Priority: Ollama (local) > Claude Haiku > OpenAI > Fallback (keyword-based)
 */

import * as ollamaProcessor from './event-processor-ollama';
import * as haikuProcessor from './event-processor-haiku';
import * as openaiProcessor from './event-processor';
import type { Topic } from './db/schema';
import type { CollectedItem } from './db/collector';
import { ANTHROPIC_API_KEY, OPENAI_API_KEY, OLLAMA_BASE_URL } from './env';

export type RawInput = haikuProcessor.RawInput;
export type { RawTextInput, RawRSSItem, RawAPIResponse } from './event-processor-haiku';

export type ProcessorBackend = 'ollama' | 'haiku' | 'openai' | 'fallback';

let ollamaAvailable: boolean | null = null;

/**
 * Check if Ollama is available (cached)
 */
async function checkOllamaAvailable(): Promise<boolean> {
	if (ollamaAvailable !== null) return ollamaAvailable;
	ollamaAvailable = await ollamaProcessor.isOllamaAvailable();
	// Reset cache after 60 seconds
	setTimeout(() => { ollamaAvailable = null; }, 60000);
	return ollamaAvailable;
}

/**
 * Get the currently active processor backend
 */
export async function getActiveBackend(): Promise<ProcessorBackend> {
	if (await checkOllamaAvailable()) return 'ollama';
	if (ANTHROPIC_API_KEY) return 'haiku';
	if (OPENAI_API_KEY) return 'openai';
	return 'fallback';
}

/**
 * Get active backend synchronously (may not reflect Ollama status)
 */
export function getActiveBackendSync(): ProcessorBackend {
	if (ollamaAvailable) return 'ollama';
	if (ANTHROPIC_API_KEY) return 'haiku';
	if (OPENAI_API_KEY) return 'openai';
	return 'fallback';
}

/**
 * Process a raw input using the best available AI backend
 */
export async function processRawInput(
	topic: Topic,
	input: RawInput,
	keywords?: string[],
	preferredBackend?: ProcessorBackend
): Promise<CollectedItem | null> {
	const backend = preferredBackend || await getActiveBackend();

	switch (backend) {
		case 'ollama':
			if (await checkOllamaAvailable()) {
				return ollamaProcessor.processRawInput(topic, input, keywords);
			}
			// Fall through to Haiku if Ollama not available
		case 'haiku':
			if (ANTHROPIC_API_KEY) {
				return haikuProcessor.processRawInput(topic, input, keywords);
			}
			// Fall through to OpenAI if Haiku not available
		case 'openai':
			if (OPENAI_API_KEY) {
				return openaiProcessor.processRawInput(topic, input, keywords);
			}
			// Fall through to fallback
		case 'fallback':
		default:
			// Use OpenAI processor which has fallback logic built in
			return openaiProcessor.processRawInput(topic, input, keywords);
	}
}

/**
 * Process multiple raw inputs using the best available AI backend
 */
export async function processRawInputs(
	topic: Topic,
	inputs: RawInput[],
	keywords?: string[],
	preferredBackend?: ProcessorBackend
): Promise<CollectedItem[]> {
	const backend = preferredBackend || await getActiveBackend();

	switch (backend) {
		case 'ollama':
			if (await checkOllamaAvailable()) {
				return ollamaProcessor.processRawInputs(topic, inputs, keywords);
			}
		case 'haiku':
			if (ANTHROPIC_API_KEY) {
				return haikuProcessor.processRawInputs(topic, inputs, keywords);
			}
		case 'openai':
			if (OPENAI_API_KEY) {
				return openaiProcessor.processRawInputs(topic, inputs, keywords);
			}
		case 'fallback':
		default:
			return openaiProcessor.processRawInputs(topic, inputs, keywords);
	}
}

/**
 * Quick relevance check (no AI needed)
 */
export function isLikelyRelevant(content: string, keywords: string[]): boolean {
	return haikuProcessor.isLikelyRelevant(content, keywords);
}

/**
 * Check which backends are available
 */
export async function getAvailableBackends(): Promise<ProcessorBackend[]> {
	const backends: ProcessorBackend[] = [];
	if (await checkOllamaAvailable()) backends.push('ollama');
	if (ANTHROPIC_API_KEY) backends.push('haiku');
	if (OPENAI_API_KEY) backends.push('openai');
	backends.push('fallback');
	return backends;
}

/**
 * Get available Ollama models
 */
export async function getOllamaModels(): Promise<string[]> {
	return ollamaProcessor.getAvailableModels();
}
