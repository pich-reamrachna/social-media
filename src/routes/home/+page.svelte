<script lang="ts">
	import { resolve } from '$app/paths'
	import { enhance } from '$app/forms'
	import { invalidateAll } from '$app/navigation'
	import SideNav from '$lib/components/SideNav.svelte'
	import Post from '$lib/components/Post.svelte'
	import RightSidebar from '$lib/components/RightSidebar.svelte'
	import PageTopBar from '$lib/components/PageTopBar.svelte'
	import './home.css'
	import { deserialize } from '$app/forms'

	import type { PageData } from './$types'
	const { data }: { data: PageData } = $props()
	type FeedPost = PageData['posts'][number]

	let active_tab = $state<'for-you' | 'following'>('for-you')
	const home_tabs = [
		{ id: 'for-you', label: 'For You' },
		{ id: 'following', label: 'Following' }
	]
	let search_query = $state('')
	let is_settings_open = $state(false)
	let post_draft = $state('')
	let composer_form: HTMLFormElement | undefined = $state(undefined)
	let selected_image_name = $state('')
	let selected_image_preview = $state<string | undefined>(undefined)
	const liked_posts = $state<Record<string, boolean>>({})
	const like_count_override = $state<Record<string, number>>({})
	const followed_users = $state<Record<string, boolean>>({})

	let is_posting = $state(false)
	let is_error_banner_visible = $state(false)
	let toast = $state<{
		type: 'success' | 'error' | 'warning' | 'loading'
		message: string
		visible: boolean
	}>({
		type: 'success',
		message: '',
		visible: false
	})

	async function toggle_like(post_id: string) {
		const post = data.posts.find((p: FeedPost) => p.id === post_id)
		if (!post) return

		const is_liked = liked_posts[post_id] ?? post.is_liked_by_user
		const likes = like_count_override[post_id] ?? post.stats.likes

		// Optimistic update
		liked_posts[post_id] = !is_liked
		like_count_override[post_id] = !is_liked ? likes + 1 : Math.max(0, likes - 1)

		const form_data = new FormData()
		form_data.append('postId', post_id)

		try {
			const response = await fetch('?/toggleLike', {
				method: 'POST',
				body: form_data
			})
			const result = deserialize(await response.text())
			if (result.type === 'failure' || result.type === 'error') {
				throw new Error()
			}

			// Wait for server state to refresh
			await invalidateAll()

			// Clear overrides so we use the fresh data from the server
			delete liked_posts[post_id]
			delete like_count_override[post_id]
		} catch {
			// Rollback on error
			liked_posts[post_id] = is_liked
			like_count_override[post_id] = likes
			show_toast('error', 'Failed to update like')
		}
	}

	function toggle_follow(handle: string): void {
		followed_users[handle] = !(followed_users[handle] ?? false)
	}

	function filter_posts() {
		const q = search_query.toLowerCase().trim()
		if (!q) return data.posts
		return data.posts.filter(
			(post: FeedPost) =>
				post.content.toLowerCase().includes(q) ||
				post.author.name.toLowerCase().includes(q) ||
				(post.author.handle ?? '').toLowerCase().includes(q)
		)
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
</script>

<div class="home-shell">
	{#if toast.visible}
		<div
			class="toast"
			class:toast-success={toast.type === 'success'}
			class:toast-error={toast.type === 'error'}
			class:toast-warning={toast.type === 'warning'}
			class:toast-loading={toast.type === 'loading'}
		>
			{#if toast.type === 'loading'}
				<div class="toast-spinner"></div>
			{:else if toast.type === 'success'}
				<svg class="toast-icon" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
						clip-rule="evenodd"
					/>
				</svg>
			{:else if toast.type === 'error'}
				<svg class="toast-icon" fill="currentColor" viewBox="0 0 20 20">
					<path
						fill-rule="evenodd"
						d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
						clip-rule="evenodd"
					/>
				</svg>
			{:else}
				<svg class="toast-icon" fill="currentColor" viewBox="0 0 20 20">
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

	<SideNav
		current_user={data.current_user}
		active_route={resolve('/home')}
		{is_settings_open}
		on_settings_toggle={() => (is_settings_open = !is_settings_open)}
	/>

	<section class="mobile-prelude" aria-label="Top feed section">
		<div class="mobile-header">
			<span class="mobile-logo">Y</span>
			<img src={data.current_user.avatar_url} alt={data.current_user.name} class="mobile-avatar" />
		</div>
	</section>

	<main class="feed-column">
		<div class="feed-sticky-controls">
			<PageTopBar
				tabs={home_tabs}
				{active_tab}
				on_change={(tab) => (active_tab = tab as 'for-you' | 'following')}
				extra_class="feed-topbar-main"
			/>
			<div class="feed-search-group feed-search-main">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="feed-search-icon"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
				<input
					type="search"
					value={search_query}
					oninput={(e) => (search_query = (e.target as HTMLInputElement).value)}
					placeholder="Search"
					aria-label="Search posts"
					class="feed-search-input"
				/>
			</div>
		</div>

		{#if is_settings_open}
			<section class="settings-panel">
				<h4>Settings</h4>
				<ul>
					<li><button type="button" class="settings-option">Logout</button></li>
				</ul>
			</section>
		{/if}

		<form
			bind:this={composer_form}
			// direct access to this specific form element
			class="composer"
			method="POST"
			enctype="multipart/form-data"
			action="?/createPost"
			use:enhance={({ formElement }) => {
				is_posting = true
				show_toast('loading', 'Posting...')
				return async ({ result, update }) => {
					is_posting = false
					if (result.type === 'success') {
						post_draft = ''
						clear_selected_image(formElement)
						show_toast('success', 'Post created!')
					} else {
						show_toast('error', 'Failed to post')
					}
					await update()
				}
			}}
		>
			<img
				src={data.current_user.avatar_url}
				alt={data.current_user.name}
				class="composer-avatar"
			/>
			<div class="composer-body">
				<input
					type="text"
					name="content"
					bind:value={post_draft}
					placeholder="What's happening?"
					class="composer-input"
				/>
				<input
					id="composer-image"
					type="file"
					name="image"
					accept="image/*"
					class="composer-file-input"
					onchange={handle_image_change}
				/>
				{#if selected_image_preview}
					<div class="composer-image-preview">
						<img src={selected_image_preview} alt="Selected attachment preview" />
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
						<label for="composer-image" class="media-btn" aria-label="Add image">
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
						</label>
					</div>
					<button
						type="submit"
						class="submit-post-btn"
						disabled={(!post_draft.trim() && !selected_image_preview) || is_posting}
					>
						{is_posting ? 'Posting...' : 'Post'}
					</button>
				</div>
			</div>
		</form>

		<div class="desktop-posts">
			{#each filter_posts() as post (post.id)}
				<Post
					name={post.author.name}
					handle={post.author.handle ?? ''}
					content={post.content}
					images={post.images}
					timestamp={post.timestamp}
					likes={like_count_override[post.id] ?? post.stats.likes}
					is_liked={liked_posts[post.id] ?? post.is_liked_by_user}
					on_like={() => toggle_like(post.id)}
				/>
			{/each}
		</div>
	</main>

	<RightSidebar
		trending={data.trending}
		who_to_follow={data.who_to_follow}
		{search_query}
		{followed_users}
		on_search_change={(value) => (search_query = value)}
		on_toggle_follow={toggle_follow}
	/>

	<footer class="mobile-legal-footer">
		<a href={resolve('/terms')}>Terms of Service</a>
		<a href={resolve('/privacy')}>Privacy Policy</a>
		<a href={resolve('/cookies')}>Cookie Policy</a>
		<span>© 2026 Y.</span>
	</footer>
</div>
