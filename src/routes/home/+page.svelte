<script lang="ts">
	import { untrack } from 'svelte'
	import { resolve } from '$app/paths'
	import { enhance } from '$app/forms'
	import { goto, beforeNavigate } from '$app/navigation'
	import SideNav from '$lib/components/SideNav.svelte'
	import Post from '$lib/components/Post.svelte'
	import RightSidebar from '$lib/components/RightSidebar.svelte'
	import SearchDropdown from '$lib/components/SearchDropdown.svelte'
	import PageTopBar from '$lib/components/PageTopBar.svelte'
	import './home.css'
	import { deserialize } from '$app/forms'

	import type { PageData } from './$types'
	import { type SideNavUser, type ProfilePost } from '$lib/types'
	import { MAX_POST_LENGTH, FEED_LIMIT } from '$lib/constants/post'
	const {
		data
	}: {
		data: PageData & {
			current_user: SideNavUser
			posts: ProfilePost[]
			who_to_follow: SideNavUser[]
		}
	} = $props()

	let current_user_override = $state<SideNavUser | undefined>()
	const current_user = $derived(current_user_override ?? data.current_user)
	const who_to_follow = $derived(data.who_to_follow)
	type FeedPost = ProfilePost

	let search_query = $state('')
	let search_results = $state<SideNavUser[]>([])
	let applied_keyword_search = $state('')
	let search_timer: ReturnType<typeof setTimeout> | undefined
	let is_settings_open = $state(false)
	let post_draft = $state('')
	let composer_form: HTMLFormElement | undefined = $state(undefined)
	let composer_image_input: HTMLInputElement | undefined = $state(undefined)
	let selected_image_name = $state('')
	let selected_image_preview = $state<string | undefined>(undefined)
	const liked_posts = $state<Record<string, boolean>>({})
	const like_count_override = $state<Record<string, number>>({})

	let feed_posts = $state<FeedPost[]>(data.posts)
	let has_more = $state(data.posts.length >= FEED_LIMIT)
	let is_loading_more = $state(false)

	$effect(() => {
		function on_scroll() {
			const remaining = document.documentElement.scrollHeight - window.scrollY - window.innerHeight
			if (remaining < 400) load_more_posts()
		}
		window.addEventListener('scroll', on_scroll, { passive: true })
		untrack(on_scroll)
		return () => window.removeEventListener('scroll', on_scroll)
	})

	async function load_more_posts() {
		if (is_loading_more || !has_more) return
		const last = feed_posts[feed_posts.length - 1]
		if (!last) return
		is_loading_more = true
		try {
			const cursor = new Date(last.timestamp as string | Date).toISOString()
			const res = await fetch(`/api/feed?cursor=${encodeURIComponent(cursor)}`)
			if (!res.ok) return
			const payload = (await res.json()) as { posts: FeedPost[]; has_more: boolean }
			feed_posts = [...feed_posts, ...payload.posts]
			has_more = payload.has_more
		} catch {
			// user can scroll again to retry
		} finally {
			is_loading_more = false
		}
	}

	let is_posting = $state(false)
	let is_error_banner_visible = $state(false)
	let is_discard_dialog_open = $state(false)
	let pending_navigation_url = $state<string | undefined>(undefined)
	let discard_keep_btn = $state<HTMLButtonElement | undefined>(undefined)
	let toast = $state<{
		type: 'success' | 'error' | 'warning' | 'loading'
		message: string
		visible: boolean
	}>({
		type: 'success',
		message: '',
		visible: false
	})

	const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024
	const ALLOWED_IMAGE_MIME_TYPES = new Set([
		'image/jpeg',
		'image/png',
		'image/gif',
		'image/webp',
		'image/heic',
		'image/heif'
	])

	function get_safe_count(count: number | string | undefined) {
		const parsed_count = Number(count ?? 0)
		return Number.isFinite(parsed_count) ? Math.max(0, parsed_count) : 0
	}

	// Reactive character count
	// eslint-disable-next-line prefer-const
	let character_count = $derived(post_draft.length)
	// eslint-disable-next-line prefer-const
	let remaining_chars = $derived(Math.max(0, MAX_POST_LENGTH - character_count))
	// eslint-disable-next-line prefer-const
	let is_over_limit = $derived(character_count > MAX_POST_LENGTH)
	const has_composer_draft = $derived(post_draft.trim() !== '' || !!selected_image_preview)

	async function toggle_like(post_id: string) {
		const post = feed_posts.find((p: FeedPost) => p.id === post_id)
		if (!post) return

		const is_liked = liked_posts[post_id] ?? post.is_liked_by_user
		const likes = like_count_override[post_id] ?? post.stats.likes

		// Optimistic update
		liked_posts[post_id] = !is_liked
		like_count_override[post_id] = !is_liked ? likes + 1 : Math.max(0, likes - 1)

		const form_data = new FormData()
		form_data.append('postId', post_id)

		try {
			const response = await fetch('?/toggle_like', {
				method: 'POST',
				body: form_data
			})
			const result = deserialize(await response.text())
			if (result.type === 'failure' || result.type === 'error') {
				throw new Error()
			}

			const payload =
				result.type === 'success'
					? (result.data as { is_liked?: boolean; likes?: number } | undefined)
					: undefined

			if (typeof payload?.is_liked === 'boolean') {
				liked_posts[post_id] = payload.is_liked
			}
			if (typeof payload?.likes === 'number') {
				like_count_override[post_id] = payload.likes
			}
		} catch {
			// Rollback on error
			liked_posts[post_id] = is_liked
			like_count_override[post_id] = likes
			show_toast('error', 'Failed to update like')
		}
	}

	async function toggle_follow(user_id: string) {
		try {
			const form_data = new FormData()
			form_data.append('userId', user_id)

			const response = await fetch('?/toggle_follow', { method: 'POST', body: form_data })
			const result = deserialize(await response.text())

			if (result.type !== 'success') {
				throw new Error('Failed to update follow')
			}

			const payload = result.data as { is_following?: boolean }
			if (typeof payload.is_following !== 'boolean') {
				throw new Error('Failed to update follow')
			}

			if (!current_user) {
				throw new Error('Failed to update follow')
			}
			const current_user_snapshot = current_user
			current_user_override = {
				...current_user_snapshot,
				stats: {
					followers: get_safe_count(current_user_snapshot.stats?.followers),
					following: Math.max(
						0,
						get_safe_count(current_user_snapshot.stats?.following) + (payload.is_following ? 1 : -1)
					)
				}
			}
			show_toast('success', payload.is_following ? 'Followed!' : 'Unfollowed')
			return true
		} catch (error) {
			show_toast(
				'error',
				error instanceof Error && error.message ? error.message : 'Failed to update follow'
			)
			return false
		}
	}

	function filter_posts() {
		const q = applied_keyword_search.toLowerCase().trim()
		if (!q) return feed_posts
		return feed_posts.filter((post: FeedPost) => post.content.toLowerCase().includes(q))
	}

	function fetch_search_users(q: string) {
		if (search_timer) clearTimeout(search_timer)
		if (!q.trim()) {
			search_results = []
			return
		}
		search_timer = setTimeout(async () => {
			const res = await fetch(`/api/search/users?q=${encodeURIComponent(q.trim())}`)
			if (!res.ok) return
			const payload = (await res.json()) as { users: SideNavUser[] }
			search_results = payload.users
		}, 300)
	}

	function on_search_change(value: string) {
		search_query = value
		fetch_search_users(value)
	}

	function open_profile(handle: string) {
		search_query = ''
		search_results = []
		goto(resolve(`/profile/${handle}`))
	}

	function apply_keyword_search() {
		const q = search_query.trim()
		if (!q) return

		applied_keyword_search = q
		search_query = ''
		search_results = []
	}

	function clear_keyword_search() {
		applied_keyword_search = ''
	}

	function show_toast(
		type: 'success' | 'error' | 'warning' | 'loading',
		message: string,
		duration = 3000
	) {
		toast = { type, message, visible: true }
		if (type !== 'loading') {
			setTimeout(() => {
				toast.visible = false
			}, duration)
		}
	}

	function refresh_feed() {
		show_toast('loading', 'Refreshing...')
		setTimeout(() => {
			show_toast('success', 'Feed refreshed!')
			is_error_banner_visible = false
		}, 1500)
	}

	function handle_image_change(event: Event) {
		const input = event.currentTarget as HTMLInputElement
		const file = input.files?.[0]

		if (!file) {
			selected_image_name = ''
			selected_image_preview = undefined
			return
		}

		const lower_name = file.name.toLowerCase()
		const is_heif_by_extension =
			file.type === '' && (lower_name.endsWith('.heic') || lower_name.endsWith('.heif'))
		if (!is_heif_by_extension && !ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
			clear_selected_image(composer_form ?? undefined)
			show_toast('error', 'Only JPEG, PNG, GIF, WebP, and HEIC/HEIF images are supported')
			return
		}

		if (file.size > MAX_IMAGE_SIZE_BYTES) {
			clear_selected_image(composer_form ?? undefined)
			show_toast('error', 'Image must be 5MB or less')
			return
		}

		if (selected_image_preview) {
			URL.revokeObjectURL(selected_image_preview)
		}

		selected_image_name = file.name
		selected_image_preview = URL.createObjectURL(file)
	}

	function clear_selected_image(form?: HTMLFormElement) {
		if (selected_image_preview) {
			URL.revokeObjectURL(selected_image_preview)
		}

		selected_image_name = ''
		selected_image_preview = undefined

		const image_input = form?.querySelector<HTMLInputElement>('input[name="image"]')
		if (image_input) {
			image_input.value = ''
		}
	}

	beforeNavigate(({ cancel, to, type }) => {
		if (!has_composer_draft || type === 'leave') return
		cancel()
		pending_navigation_url = to?.url.pathname
		is_discard_dialog_open = true
	})

	$effect(() => {
		const handle_beforeunload = (e: BeforeUnloadEvent) => {
			if (has_composer_draft) e.preventDefault()
		}
		window.addEventListener('beforeunload', handle_beforeunload)
		return () => window.removeEventListener('beforeunload', handle_beforeunload)
	})

	$effect(() => {
		if (!is_discard_dialog_open) return
		discard_keep_btn?.focus()
		document.body.style.overflow = 'hidden'
		const handle_keydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') cancel_discard()
		}
		document.addEventListener('keydown', handle_keydown)
		return () => {
			document.body.style.overflow = ''
			document.removeEventListener('keydown', handle_keydown)
		}
	})

	function confirm_discard() {
		post_draft = ''
		clear_selected_image(composer_form ?? undefined)
		is_discard_dialog_open = false
		const url = pending_navigation_url
		pending_navigation_url = undefined
		if (url) goto(resolve(url as '/'))
	}

	function cancel_discard() {
		is_discard_dialog_open = false
		pending_navigation_url = undefined
	}
</script>

<div class="home-shell">
	{#if toast.visible}
		<div
			class="toast"
			class:toast-success={toast.type === 'success'}
			class:toast-error={toast.type === 'error'}
			class:toast-warning={toast.type === 'warning'}
			class:toast-loading={toast.type === 'loading'}
			role="status"
			aria-live="polite"
		>
			{#if toast.type === 'loading'}
				<div class="toast-spinner"></div>
			{:else if toast.type === 'success'}
				<svg class="toast-icon" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
			{:else if toast.type === 'error'}
				<svg class="toast-icon" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
			{:else}
				<svg class="toast-icon" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
					<path
						fill-rule="evenodd"
						d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
						clip-rule="evenodd"
					/>
				</svg>
			{/if}
			<span class="toast-message">{toast.message}</span>
		</div>
	{/if}

	{#if is_error_banner_visible}
		<div class="error-banner">
			<div class="error-banner-content">
				<span class="error-banner-text">🌐 No Internet Connection</span>
				<button type="button" class="error-banner-refresh" onclick={refresh_feed}> Refresh </button>
			</div>
		</div>
	{/if}

	{#if current_user}
		<SideNav
			{current_user}
			active_route={resolve('/home')}
			{is_settings_open}
			on_settings_toggle={() => (is_settings_open = !is_settings_open)}
		/>
	{/if}

	<section class="mobile-prelude" aria-label="Top feed section">
		<div class="mobile-header">
			<span class="mobile-logo">Y</span>
		</div>
	</section>

	<main class="feed-column">
		<div class="feed-sticky-controls">
			<PageTopBar title="For You" extra_class="feed-topbar-main" />
			<SearchDropdown
				extra_class="feed-search-main"
				aria_label="Search posts"
				{search_query}
				search_users={search_results}
				{on_search_change}
				on_open_profile={open_profile}
				on_apply_keyword_search={apply_keyword_search}
			/>
		</div>

		{#if applied_keyword_search}
			<section class="settings-panel">
				<h4>Keyword Filter</h4>
				<ul>
					<li>
						<button type="button" class="settings-option" onclick={clear_keyword_search}>
							Clear "{applied_keyword_search}"
						</button>
					</li>
				</ul>
			</section>
		{/if}

		<form
			bind:this={composer_form}
			// direct access to this specific form element
			class="composer"
			method="POST"
			enctype="multipart/form-data"
			action="?/create_post"
			use:enhance={() => {
				is_posting = true
				show_toast('loading', 'Posting...')
				return async ({ result, update }) => {
					is_posting = false
					await update()

					if (result.type === 'success') {
						post_draft = ''
						clear_selected_image(composer_form ?? undefined)
						feed_posts = data.posts
						has_more = data.posts.length >= FEED_LIMIT
						show_toast('success', 'Post created!')
					} else {
						const failure_msg =
							result.type === 'failure' &&
							result.data &&
							typeof result.data === 'object' &&
							'message' in result.data &&
							typeof result.data.message === 'string'
								? result.data.message
								: 'Failed to post'

						show_toast('error', failure_msg)
					}
				}
			}}
		>
			<img src={current_user?.avatar_url} alt={current_user?.name ?? ''} class="composer-avatar" />
			<div class="composer-body">
				<textarea
					name="content"
					bind:value={post_draft}
					placeholder="What's happening?"
					class="composer-input"
					rows="3"
					maxlength={MAX_POST_LENGTH}
				></textarea>
				<div class="composer-footer">
					{#if post_draft.trim()}
						<div class="character-counter" class:over-limit={is_over_limit}>
							{remaining_chars}
						</div>
					{/if}
				</div>
				<input
					bind:this={composer_image_input}
					id="composer-image"
					type="file"
					name="image"
					accept="image/jpeg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif"
					class="composer-file-input"
					onchange={handle_image_change}
				/>
				{#if selected_image_preview}
					<div class="composer-image-preview">
						<img
							src={selected_image_preview}
							alt="Selected attachment preview"
							onerror={(e) => {
								;(e.currentTarget as HTMLImageElement).style.display = 'none'
							}}
						/>
						<div class="composer-image-meta">
							<span>{selected_image_name}</span>
							<button
								type="button"
								class="composer-image-remove"
								onclick={() => clear_selected_image(composer_form ?? undefined)}
							>
								Remove
							</button>
						</div>
					</div>
				{/if}
				<div class="composer-actions">
					<div class="composer-media-btns">
						<button
							type="button"
							class="media-btn"
							aria-label="Add image"
							onclick={() => composer_image_input?.click()}
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="media-icon"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
								/>
							</svg>
						</button>
					</div>
					<button
						type="submit"
						class="submit-post-btn"
						disabled={(!post_draft.trim() && !selected_image_preview) ||
							is_posting ||
							is_over_limit}
					>
						{is_posting ? 'Posting...' : 'Post'}
					</button>
				</div>
			</div>
		</form>

		<div class="desktop-posts">
			{#if applied_keyword_search && filter_posts().length === 0}
				<div class="search-empty-state">
					<p class="search-empty-title">No matches found</p>
					<p class="search-empty-copy">
						No post matched "{applied_keyword_search}".
					</p>
				</div>
			{:else}
				{#each filter_posts() as post (post.id)}
					<Post
						name={post.author.name}
						handle={post.author.handle ?? ''}
						avatar_url={post.author.avatar_url}
						content={post.content}
						images={post.images}
						timestamp={post.timestamp}
						likes={like_count_override[post.id] ?? post.stats.likes}
						is_liked={liked_posts[post.id] ?? post.is_liked_by_user}
						on_like={() => toggle_like(post.id)}
					/>
				{/each}
			{/if}

			{#if is_loading_more}
				{#each [0, 1, 2] as i (i)}
					<div class="skeleton-post">
						<div class="skeleton-post-header">
							<div class="skeleton skeleton-avatar"></div>
							<div class="skeleton-meta">
								<div class="skeleton skeleton-name"></div>
								<div class="skeleton skeleton-handle"></div>
							</div>
						</div>
						<div class="skeleton-body">
							<div class="skeleton skeleton-line"></div>
							<div class="skeleton skeleton-line-med"></div>
							<div class="skeleton skeleton-line-short"></div>
						</div>
						<div class="skeleton-actions">
							<div class="skeleton skeleton-action"></div>
							<div class="skeleton skeleton-action"></div>
						</div>
					</div>
				{/each}
			{/if}

			{#if !has_more && feed_posts.length > 0 && !is_loading_more}
				<p class="feed-end-message">You're all caught up</p>
			{/if}
		</div>
	</main>

	<RightSidebar
		{who_to_follow}
		{search_query}
		search_users={search_results}
		{on_search_change}
		on_open_profile={open_profile}
		on_apply_keyword_search={apply_keyword_search}
		on_toggle_follow={toggle_follow}
	/>

	<footer class="mobile-legal-footer">
		<span>© 2026 Y.</span>
	</footer>

	{#if is_discard_dialog_open}
		<div
			class="discard-overlay"
			role="presentation"
			onclick={cancel_discard}
			onkeydown={(e) => {
				if (e.key === 'Escape') cancel_discard()
			}}
		>
			<div
				class="discard-dialog"
				role="dialog"
				aria-modal="true"
				aria-labelledby="discard-title"
				tabindex="-1"
				onclick={(e) => e.stopPropagation()}
				onkeydown={(e) => {
					if (e.key !== 'Escape') {
						e.stopPropagation()
					}
				}}
			>
				<h2 id="discard-title" class="discard-title">Discard post?</h2>
				<p class="discard-body">Your draft and any attached image will be lost.</p>
				<div class="discard-actions">
					<button type="button" class="discard-btn-confirm" onclick={confirm_discard}>
						Discard
					</button>
					<button
						bind:this={discard_keep_btn}
						type="button"
						class="discard-btn-cancel"
						onclick={cancel_discard}
					>
						Keep editing
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
