<script lang="ts">
	import { resolve } from '$app/paths'
	import { slide } from 'svelte/transition'
	import { cubicInOut } from 'svelte/easing'

	const {
		name,
		handle,
		avatar_url,
		content,
		images = [],
		likes,
		timestamp,
		is_liked = false,
		on_like,
		on_close
	}: {
		name: string
		handle: string
		avatar_url: string | undefined
		content: string
		images?: string[]
		likes: number
		timestamp: string | Date
		is_liked?: boolean
		on_like: () => void
		on_close: () => void
	} = $props()

	let is_expanded = $state(false)
	let content_mobile_el: HTMLParagraphElement | undefined = $state()
	let is_truncatable_mobile = $state(false)
	let dialog_el: HTMLElement | undefined = $state()
	let previously_focused: HTMLElement | undefined = undefined
	const has_image = $derived(images.length > 0)

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

	$effect(() => {
		document.body.style.overflow = 'hidden'
		return () => {
			document.body.style.overflow = ''
		}
	})

	function update_mobile_truncation() {
		if (is_expanded) return
		const el = content_mobile_el
		if (!el) return
		is_truncatable_mobile = el.scrollHeight > el.clientHeight
	}

	function get_focusable_elements(root: HTMLElement): HTMLElement[] {
		return Array.from(
			root.querySelectorAll<HTMLElement>(
				'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
			)
		).filter((el) => !el.hasAttribute('disabled') && Boolean(el.offsetParent))
	}

	function handle_keydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			event.preventDefault()
			on_close()
			return
		}

		if (event.key !== 'Tab') return

		const root = dialog_el
		if (!root) return

		const focusable = get_focusable_elements(root)
		if (!focusable.length) return

		const first = focusable[0]!
		const last = focusable[focusable.length - 1]!
		const active = document.activeElement as HTMLElement | null

		if (event.shiftKey && active === first) {
			event.preventDefault()
			last.focus()
			return
		}

		if (!event.shiftKey && active === last) {
			event.preventDefault()
			first.focus()
		}
	}

	$effect(() => {
		const dialog = dialog_el
		if (!dialog) return

		previously_focused =
			document.activeElement instanceof HTMLElement ? document.activeElement : undefined
		const focusable = get_focusable_elements(dialog)
		;(focusable[0] ?? dialog).focus()

		return () => {
			if (previously_focused) {
				previously_focused.focus()
				previously_focused = undefined
			}
		}
	})

	$effect(() => {
		const el = content_mobile_el
		if (!el) return

		update_mobile_truncation()

		const observer = new ResizeObserver(update_mobile_truncation)
		observer.observe(el)
		window.addEventListener('resize', update_mobile_truncation)

		return () => {
			observer.disconnect()
			window.removeEventListener('resize', update_mobile_truncation)
		}
	})
</script>

<div
	class="post-modal-backdrop"
	role="dialog"
	aria-modal="true"
	aria-label="Post detail"
	tabindex="-1"
	bind:this={dialog_el}
	onkeydown={handle_keydown}
>
	<!-- X button is the only way to close -->
	<button class="post-modal-close" onclick={on_close} aria-label="Close">
		<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
			<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
		</svg>
	</button>

	<!-- ===== DESKTOP (md+) ===== -->
	<div class="post-modal-desktop">
		{#if has_image}
			<div class="post-modal-image-side">
				<img src={images[0]} alt="Post attachment" class="post-modal-image" />
			</div>
		{/if}

		<div
			class="post-modal-panel {has_image
				? 'post-modal-panel--with-image'
				: 'post-modal-panel--solo'}"
			role="presentation"
			onclick={(e) => e.stopPropagation()}
		>
			<div class="post-modal-panel-header">
				<a href={resolve(`/profile/${handle}`)} onclick={on_close} class="post-modal-avatar-link">
					<img src={avatar_url || '/profile.png'} alt={name} class="post-modal-avatar" />
				</a>
				<div class="post-modal-meta">
					<a href={resolve(`/profile/${handle}`)} onclick={on_close} class="post-modal-name-row">
						<span class="post-modal-name">{name}</span>
						<span class="post-modal-handle">@{handle}</span>
					</a>
					<span class="post-modal-time">{format_time(timestamp)}</span>
				</div>
			</div>
			<div class="post-modal-content">
				<p class="post-modal-text">{content}</p>
			</div>
			<div class="post-modal-actions">
				<button
					class="post-modal-like {is_liked ? 'post-modal-like--active' : ''}"
					aria-label="Like"
					onclick={on_like}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
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
		</div>
	</div>

	<!-- ===== MOBILE (< md) ===== -->
	<div class="post-modal-mobile">
		{#if has_image}
			<!-- Image fills full screen; tap to collapse expanded text -->
			<button
				type="button"
				class="post-modal-mobile-image-area {is_expanded
					? 'post-modal-mobile-image-area--collapsible'
					: ''}"
				onclick={() => {
					if (is_expanded) is_expanded = false
				}}
				aria-label="Collapse post text"
				disabled={!is_expanded}
			>
				<img src={images[0]} alt="Post attachment" class="post-modal-mobile-image" />
				<div class="post-modal-dim {is_expanded ? 'post-modal-dim--active' : ''}"></div>
			</button>

			<!-- Bottom panel -->
			<div class="post-modal-bottom" role="presentation" onclick={(e) => e.stopPropagation()}>
				<div class="post-modal-bottom-profile">
					<a href={resolve(`/profile/${handle}`)} onclick={on_close} class="post-modal-avatar-link">
						<img
							src={avatar_url || '/profile.png'}
							alt={name}
							class="post-modal-avatar post-modal-avatar--sm"
						/>
					</a>
					<a href={resolve(`/profile/${handle}`)} onclick={on_close} class="post-modal-name-row">
						<span class="post-modal-name">{name}</span>
						<span class="post-modal-handle">@{handle}</span>
					</a>
					<span class="post-modal-time post-modal-time--right">{format_time(timestamp)}</span>
				</div>

				<div class="post-modal-bottom-text">
					{#if is_expanded}
						<div transition:slide={{ duration: 300, easing: cubicInOut }}>
							<div class="post-modal-expanded-scroll">
								<p class="post-modal-text post-modal-text--mobile">{content}</p>
							</div>
							<button class="post-modal-toggle" onclick={() => (is_expanded = false)}
								>Show less</button
							>
						</div>
					{:else}
						<div transition:slide={{ duration: 300, easing: cubicInOut }}>
							<p
								bind:this={content_mobile_el}
								class="post-modal-text post-modal-text--mobile post-modal-text--clamped"
							>
								{content}
							</p>
							{#if is_truncatable_mobile}
								<button class="post-modal-toggle" onclick={() => (is_expanded = true)}
									>Show more</button
								>
							{/if}
						</div>
					{/if}
				</div>

				<button
					class="post-modal-like {is_liked ? 'post-modal-like--active' : ''}"
					aria-label="Like"
					onclick={on_like}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
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
		{:else}
			<!-- Text-only mobile: centred card -->
			<div class="post-modal-mobile-textcard-wrap" role="presentation">
				<div
					class="post-modal-mobile-textcard"
					role="presentation"
					onclick={(e) => e.stopPropagation()}
				>
					<div class="post-modal-panel-header">
						<a
							href={resolve(`/profile/${handle}`)}
							onclick={on_close}
							class="post-modal-avatar-link"
						>
							<img src={avatar_url || '/profile.png'} alt={name} class="post-modal-avatar" />
						</a>
						<div class="post-modal-meta">
							<a
								href={resolve(`/profile/${handle}`)}
								onclick={on_close}
								class="post-modal-name-row"
							>
								<span class="post-modal-name">{name}</span>
								<span class="post-modal-handle">@{handle}</span>
							</a>
							<span class="post-modal-time">{format_time(timestamp)}</span>
						</div>
					</div>
					<div class="post-modal-content">
						<p
							bind:this={content_mobile_el}
							class="post-modal-text {!is_expanded ? 'post-modal-text--clamped' : ''}"
						>
							{content}
						</p>
						{#if is_truncatable_mobile}
							<button
								class="post-modal-toggle"
								style="display: block; margin-top: 0.375rem;"
								onclick={() => (is_expanded = !is_expanded)}
							>
								{is_expanded ? 'Show less' : 'Show more'}
							</button>
						{/if}
					</div>
					<div class="post-modal-actions">
						<button
							class="post-modal-like {is_liked ? 'post-modal-like--active' : ''}"
							aria-label="Like"
							onclick={on_like}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
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
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	.post-modal-backdrop {
		position: fixed;
		inset: 0;
		z-index: 200;
		background: rgba(0, 0, 0, 0.92);
		animation: modal-fade 0.18s ease-out;
	}

	@keyframes modal-fade {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Close button */
	.post-modal-close {
		position: absolute;
		top: 1rem;
		left: 1rem;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2.25rem;
		height: 2.25rem;
		border-radius: 9999px;
		border: none;
		background: rgba(0, 0, 0, 0.6);
		color: #fff;
		cursor: pointer;
		backdrop-filter: blur(4px);
		transition: background 0.15s;
	}
	.post-modal-close:hover {
		background: rgba(0, 0, 0, 0.85);
	}
	.post-modal-close svg {
		width: 1.125rem;
		height: 1.125rem;
	}

	/* ── DESKTOP ── */
	.post-modal-desktop {
		display: none;
		height: 100%;
		width: 100%;
	}

	.post-modal-image-side {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: #000;
	}
	.post-modal-image {
		max-height: 100vh;
		max-width: 100%;
		object-fit: contain;
	}

	.post-modal-panel {
		display: flex;
		flex-direction: column;
		background: #111;
		flex-shrink: 0;
	}
	.post-modal-panel--with-image {
		width: 360px;
		border-left: 1px solid #2a2a2a;
	}
	.post-modal-panel--solo {
		width: min(560px, 90vw);
		margin: auto;
		border: 1px solid #2a2a2a;
		border-radius: 1rem;
		max-height: 80vh;
	}

	.post-modal-panel-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-bottom: 1px solid #222;
	}
	.post-modal-avatar-link {
		flex-shrink: 0;
	}
	.post-modal-avatar {
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 9999px;
		object-fit: cover;
		background: #1f1f1f;
	}
	.post-modal-avatar--sm {
		width: 2rem;
		height: 2rem;
	}
	.post-modal-meta {
		min-width: 0;
		flex: 1;
	}
	.post-modal-name-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.375rem;
		text-decoration: none;
		color: inherit;
	}
	.post-modal-name {
		font-size: 0.9rem;
		font-weight: 700;
		color: #f3f4f6;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.post-modal-name:hover {
		text-decoration: underline;
	}
	.post-modal-handle {
		font-size: 0.8rem;
		color: #6b7280;
	}
	.post-modal-time {
		font-size: 0.75rem;
		color: #6b7280;
		display: block;
	}
	.post-modal-time--right {
		margin-left: auto;
		white-space: nowrap;
	}

	.post-modal-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
	}
	.post-modal-text {
		white-space: pre-wrap;
		overflow-wrap: break-word;
		font-size: 0.9375rem;
		line-height: 1.65;
		color: #e5e7eb;
		margin: 0;
	}
	.post-modal-text--mobile {
		font-size: 0.875rem;
		margin-bottom: 0.5rem;
	}
	.post-modal-text--clamped {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.post-modal-actions {
		padding: 0.75rem 1rem;
		border-top: 1px solid #222;
	}
	.post-modal-like {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		border: none;
		background: none;
		cursor: pointer;
		font-size: 0.8rem;
		color: #6b7280;
		padding: 0.25rem;
		border-radius: 0.25rem;
		transition: color 0.15s;
	}
	.post-modal-like:hover {
		color: #f43f5e;
	}
	.post-modal-like--active {
		color: #f43f5e;
	}
	.post-modal-like svg {
		width: 1rem;
		height: 1rem;
	}

	.post-modal-toggle {
		border: none;
		background: none;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 600;
		color: #f43f5e;
		padding: 0;
		display: inline;
	}
	.post-modal-toggle:hover {
		text-decoration: underline;
	}

	/* ── MOBILE ── */
	.post-modal-mobile {
		display: flex;
		flex-direction: column;
		height: 100%;
		width: 100%;
	}

	.post-modal-mobile-image-area {
		flex: 1;
		min-height: 0;
		position: relative;
		background: #000;
		overflow: hidden;
		border: none;
		padding: 0;
		width: 100%;
		cursor: pointer;
		color: inherit;
		font: inherit;
		text-align: left;
		background: transparent;
	}
	.post-modal-mobile-image-area:disabled {
		cursor: default;
	}
	.post-modal-mobile-image-area--collapsible {
		cursor: pointer;
	}

	.post-modal-mobile-image {
		width: 100%;
		height: 100%;
		object-fit: contain;
	}

	.post-modal-dim {
		position: absolute;
		inset: 0;
		background: #000;
		opacity: 0;
		transition: opacity 0.3s;
		pointer-events: none;
	}
	.post-modal-dim--active {
		opacity: 0.65;
	}

	/* Bottom panel */
	.post-modal-bottom {
		flex-shrink: 0;
		background: rgba(10, 10, 10, 0.92);
		backdrop-filter: blur(12px);
		padding: 0.875rem 1rem calc(env(safe-area-inset-bottom, 0px) + 0.875rem);
		border-top: 1px solid #1f1f1f;
	}
	.post-modal-bottom-profile {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		margin-bottom: 0.625rem;
	}
	.post-modal-bottom-text {
		margin-bottom: 0.5rem;
	}
	.post-modal-expanded-scroll {
		max-height: 35vh;
		overflow-y: auto;
		margin-bottom: 0.375rem;
	}

	/* Text-only mobile card */
	.post-modal-mobile-textcard-wrap {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: center;
		padding: 1rem;
	}
	.post-modal-mobile-textcard {
		width: 100%;
		max-width: 28rem;
		border-radius: 1rem;
		border: 1px solid #2a2a2a;
		background: #111;
		overflow: hidden;
	}

	@media (min-width: 768px) {
		.post-modal-desktop {
			display: flex;
		}
		.post-modal-mobile {
			display: none;
		}
		.post-modal-close {
			left: 1.25rem;
			top: 1.25rem;
		}
	}
</style>
