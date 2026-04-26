<script lang="ts">
	import { resolve } from '$app/paths'
	import PostModal from './PostModal.svelte'

	const {
		name,
		handle,
		avatar_url,
		content,
		images = [],
		likes,
		timestamp,
		is_liked = false,
		on_like
	}: {
		name: string
		handle: string
		avatar_url?: string
		content: string
		images?: string[]
		likes: number
		timestamp: string | Date
		is_liked?: boolean
		on_like: () => void
	} = $props()

	function format_count(n: number): string {
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
		if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
		return String(n)
	}

	function format_time(ts: string | Date): string {
		const date = typeof ts === 'string' ? new Date(ts) : ts
		const now = new Date()
		const diff = Math.floor((now.getTime() - date.getTime()) / 1000)

		if (diff < 60) return 'now'
		if (diff < 3600) return `${Math.floor(diff / 60)}m`
		if (diff < 86400) return `${Math.floor(diff / 3600)}h`
		if (diff < 604800) return `${Math.floor(diff / 86400)}d`
		return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
	}

	let is_modal_open = $state(false)
	let is_expanded = $state(false)
	let is_truncatable = $state(false)
	let content_el: HTMLParagraphElement | undefined = $state()

	$effect(() => {
		if (!content_el) return
		is_truncatable = content_el.scrollHeight > content_el.clientHeight
	})

	function open_image_modal(e: MouseEvent) {
		e.stopPropagation()
		if (!images.length) return
		is_modal_open = true
	}
</script>

{#if is_modal_open && images.length > 0}
	<PostModal
		{name}
		{handle}
		{avatar_url}
		{content}
		{images}
		{likes}
		{timestamp}
		{is_liked}
		{on_like}
		on_close={() => {
			is_modal_open = false
		}}
	/>
{/if}

<article class="border-b border-[#1f1f1f] p-5 transition-colors hover:bg-white/5">
	<div class="mb-3 flex items-center gap-3">
		<a
			href={resolve(`/profile/${handle}`)}
			class="shrink-0 text-inherit no-underline"
			aria-label={`Open ${name}'s profile`}
		>
			<img
				src={avatar_url || '/profile.png'}
				alt={name}
				class="h-10 w-10 rounded-full bg-[#1f1f1f] object-cover"
				loading="lazy"
			/>
		</a>

		<div class="flex min-w-0 flex-1 flex-col gap-0.5">
			<div class="flex flex-wrap items-center gap-1.5">
				<a
					href={resolve(`/profile/${handle}`)}
					class="group flex min-w-0 items-center gap-1.5 text-inherit no-underline"
				>
					<span class="truncate text-[0.9rem] font-bold text-[#f3f4f6] group-hover:underline"
						>{name}</span
					>
					<span class="truncate text-[0.8rem] text-[#6b7280]">@{handle}</span>
				</a>
				<span class="text-[0.8rem] text-[#6b7280]">·</span>
				<span class="text-[0.8rem] text-[#6b7280]">{format_time(timestamp)}</span>
			</div>
		</div>
	</div>

	<div class="mb-3.5">
		<p
			bind:this={content_el}
			class="ml-0 text-[0.9375rem] leading-relaxed wrap-break-word whitespace-pre-wrap text-[#e5e7eb] sm:ml-0 {!is_expanded
				? 'line-clamp-4'
				: ''}"
		>
			{content}
		</p>
		{#if is_truncatable}
			<button
				class="mt-1 cursor-pointer border-none bg-transparent p-0 text-sm font-semibold text-[#f43f5e] transition-colors hover:text-[#f3f4f6]"
				onclick={(e) => {
					e.stopPropagation()
					is_expanded = !is_expanded
				}}
			>
				{is_expanded ? 'Show less' : 'Show more'}
			</button>
		{/if}
	</div>

	{#if images.length === 1}
		<div class="mb-2 overflow-hidden">
			<button
				type="button"
				class="mx-auto block w-full cursor-pointer border-none bg-transparent p-0"
				aria-label="Open post image"
				onclick={open_image_modal}
			>
				<img
					src={images[0]}
					alt="Post attachment"
					class="mx-auto block max-h-100 max-w-full rounded-xl"
					loading="lazy"
				/>
			</button>
		</div>
	{/if}

	<div class="mt-2 flex items-center gap-6">
		<button
			class="flex cursor-pointer items-center gap-1.5 rounded border-none bg-none p-1 text-[0.8rem] transition-colors {is_liked
				? 'text-[#f43f5e]'
				: 'text-[#6b7280] hover:text-[#f43f5e]'}"
			aria-label="Like"
			onclick={on_like}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="h-4 w-4"
				fill={is_liked ? 'currentColor' : 'none'}
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
				/>
			</svg>
			<span>{format_count(likes)}</span>
		</button>
	</div>
</article>
