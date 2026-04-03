<script lang="ts">
	const {
		name,
		handle,
		content,
		images = [],
		likes,
		timestamp,
		is_liked = false,
		on_like
	}: {
		name: string
		handle: string
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
</script>

<article class="post-card">
	<div class="post-header">
		<div class="post-author-info">
			<div class="post-author-top">
				<span class="post-author-name">{name}</span>
				<span class="post-author-handle">@{handle}</span>
				<span class="post-dot">·</span>
				<span class="post-timestamp">{format_time(timestamp)}</span>
			</div>
		</div>
	</div>

	<p class="post-content">{content}</p>

	{#if images.length === 1}
		<div class="post-images-single">
			<img src={images[0]} alt="Post attachment" class="post-image-single" loading="lazy" />
		</div>
	{/if}

	<div class="post-actions">
		<button class="action-btn" aria-label="Comment">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="action-icon"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
				/>
			</svg>
			<span>0</span>
		</button>

		<button class="action-btn" aria-label="Retweet">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="action-icon"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
				/>
			</svg>
			<span>0</span>
		</button>

		<button
			class="action-btn"
			class:action-like-active={is_liked}
			aria-label="Like"
			onclick={on_like}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="action-icon"
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
