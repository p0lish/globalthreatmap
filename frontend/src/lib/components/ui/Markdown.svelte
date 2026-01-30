<script lang="ts">
	import { cn } from '$lib/utils/cn';
	import { marked, type Tokens } from 'marked';

	interface Props {
		content: string;
		class?: string;
	}

	let { content, class: className }: Props = $props();

	// Configure marked with GFM support
	marked.setOptions({
		gfm: true,
		breaks: true
	});

	// Custom renderer for styling
	const renderer = new marked.Renderer();

	renderer.paragraph = ({ text }: Tokens.Paragraph) => `<p class="mb-3 leading-relaxed">${text}</p>`;

	renderer.heading = ({ tokens, depth }: Tokens.Heading) => {
		const text = tokens.map((t) => ('text' in t ? t.text : '')).join('');
		const classes: Record<number, string> = {
			1: 'mb-4 mt-6 text-xl font-bold text-foreground',
			2: 'mb-3 mt-5 text-lg font-bold text-foreground',
			3: 'mb-2 mt-4 text-base font-bold text-foreground',
			4: 'mb-2 mt-3 text-base font-semibold text-foreground',
			5: 'mb-1 mt-2 text-sm font-semibold text-foreground',
			6: 'mb-1 mt-2 text-sm font-medium text-foreground'
		};
		return `<h${depth} class="${classes[depth] || ''}">${text}</h${depth}>`;
	};

	renderer.link = ({ href, title, tokens }: Tokens.Link) => {
		const text = tokens.map((t) => ('text' in t ? t.text : '')).join('');
		return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline"${title ? ` title="${title}"` : ''}>${text}</a>`;
	};

	renderer.strong = ({ text }: Tokens.Strong) =>
		`<strong class="font-semibold text-foreground">${text}</strong>`;

	renderer.em = ({ text }: Tokens.Em) => `<em class="italic">${text}</em>`;

	renderer.codespan = ({ text }: Tokens.Codespan) =>
		`<code class="rounded bg-muted px-1 py-0.5 text-xs">${text}</code>`;

	renderer.list = (token: Tokens.List) => {
		const body = token.items.map((item) => renderer.listitem(item)).join('');
		const tag = token.ordered ? 'ol' : 'ul';
		const listClass = token.ordered
			? 'my-3 ml-4 list-decimal space-y-1.5'
			: 'my-3 ml-4 list-disc space-y-1.5';
		return `<${tag} class="${listClass}">${body}</${tag}>`;
	};

	renderer.listitem = (item: Tokens.ListItem) => {
		const text = item.tokens.map((t) => ('text' in t ? t.text : '')).join('');
		return `<li class="leading-relaxed">${text}</li>`;
	};

	marked.use({ renderer });

	let html = $derived(marked.parse(content) as string);
</script>

<div class={cn('prose prose-invert max-w-none', className)}>
	{@html html}
</div>
