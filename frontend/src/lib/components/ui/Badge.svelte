<script lang="ts">
	import { cva, type VariantProps } from 'class-variance-authority';
	import { cn } from '$lib/utils/cn';
	import type { HTMLAttributes } from 'svelte/elements';

	const badgeVariants = cva(
		'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
		{
			variants: {
				variant: {
					default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
					secondary:
						'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
					destructive:
						'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
					outline: 'text-foreground',
					critical: 'border-transparent bg-red-500/20 text-red-400',
					high: 'border-transparent bg-orange-500/20 text-orange-400',
					medium: 'border-transparent bg-yellow-500/20 text-yellow-400',
					low: 'border-transparent bg-green-500/20 text-green-400',
					info: 'border-transparent bg-blue-500/20 text-blue-400'
				}
			},
			defaultVariants: {
				variant: 'default'
			}
		}
	);

	type Variant = VariantProps<typeof badgeVariants>['variant'];

	interface Props extends HTMLAttributes<HTMLDivElement> {
		variant?: Variant;
		class?: string;
	}

	let { variant = 'default', class: className, children, ...restProps }: Props = $props();
</script>

<div class={cn(badgeVariants({ variant }), className)} {...restProps}>
	{@render children?.()}
</div>
