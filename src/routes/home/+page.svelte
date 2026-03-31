<script lang="ts">
	import { resolve } from '$app/paths'
	import SideNav from '$lib/components/SideNav.svelte'
	import './home.css'

	interface PageData {
		current_user: {
			name: string
			handle: string
			avatar_url: string
		}
		posts: Array<{
			id: string
			author: {
				name: string
				handle: string
				avatar_url: string
				is_verified: boolean
				role: string
			}
			content: string
			images: string[]
			timestamp: string
			stats: {
				comments: number
				echo_count: number
				likes: number
			}
		}>
		trending: Array<{
			category: string
			tag: string
			count: string
		}>
		who_to_follow: Array<{
			name: string
			handle: string
			avatar_url: string
		}>
	}

	const { data }: { data: PageData } = $props()

	let active_tab = $state<'for-you' | 'following'>('for-you')
	let search_query = $state('')
	let is_settings_open = $state(false)
	let post_draft = $state('')
	const liked_posts = $state<Record<string, boolean>>({})
	const like_count_override = $state<Record<string, number>>({})
	const echoed_posts = $state<Record<string, boolean>>({})
	const echo_count_override = $state<Record<string, number>>({})
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

	function format_count(n: number): string {
		if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
		if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
		return String(n)
	}

	function toggle_like(post_id: string, original_count: number): void {
		liked_posts[post_id] = !(liked_posts[post_id] ?? false)
		like_count_override[post_id] = original_count + (liked_posts[post_id] ? 1 : 0)
	}

	function toggle_echo(post_id: string, original_count: number): void {
		echoed_posts[post_id] = !(echoed_posts[post_id] ?? false)
		echo_count_override[post_id] = original_count + (echoed_posts[post_id] ? 1 : 0)
	}

	function toggle_follow(handle: string): void {
		followed_users[handle] = !(followed_users[handle] ?? false)
	}

	function handle_post(e: Event): void {
		e.preventDefault()
		if (!post_draft.trim()) return
		is_posting = true
		show_toast('loading', 'Posting...')
		setTimeout(() => {
			post_draft = ''
			is_posting = false
			show_toast('success', 'Post created!')
		}, 1200)
	}

	function filter_posts() {
		const q = search_query.toLowerCase().trim()
		if (!q) return data.posts
		return data.posts.filter(
			(post) =>
				post.content.toLowerCase().includes(q) ||
				post.author.name.toLowerCase().includes(q) ||
				post.author.handle.toLowerCase().includes(q)
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

	<SideNav current_user={data.current_user} active_route={resolve('/home')} />

	<main class="feed-column">
		<div class="mobile-header">
			<span class="mobile-logo">Y</span>
			<img src={data.current_user.avatar_url} alt={data.current_user.name} class="mobile-avatar" />
		</div>

		<div class="mobile-breaking">
			<span class="breaking-label">BREAKING</span>
			<span class="breaking-text">Global markets react to new decentralization policies</span>
		</div>

		<div class="feed-topbar">
			<div class="feed-tabs">
				<button
					class="tab-btn"
					class:tab-active={active_tab === 'for-you'}
					onclick={() => (active_tab = 'for-you')}
				>
					For You
				</button>
				<button
					class="tab-btn"
					class:tab-active={active_tab === 'following'}
					onclick={() => (active_tab = 'following')}
				>
					Following
				</button>
			</div>

			<div class="feed-controls">
				<div class="search-group">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="search-icon"
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
						class="search-input"
					/>
				</div>

				<button
					type="button"
					class="settings-btn"
					aria-label="Settings"
					onclick={() => (is_settings_open = !is_settings_open)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="settings-icon"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="2"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</button>
			</div>
		</div>

		{#if is_settings_open}
			<section class="settings-panel">
				<h4>Settings</h4>
				<ul>
					<li><button type="button" class="settings-option">Dark Mode</button></li>
					<li><button type="button" class="settings-option">Light Mode</button></li>
					<li><button type="button" class="settings-option">Privacy</button></li>
					<li><button type="button" class="settings-option">Language</button></li>
					<li><button type="button" class="settings-option">Logout</button></li>
				</ul>
			</section>
		{/if}

		<form class="composer" onsubmit={handle_post}>
			<img
				src={data.current_user.avatar_url}
				alt={data.current_user.name}
				class="composer-avatar"
			/>
			<div class="composer-body">
				<input
					type="text"
					bind:value={post_draft}
					placeholder="What's happening?"
					class="composer-input"
				/>
				<div class="composer-actions">
					<div class="composer-media-btns">
						<button type="button" class="media-btn" aria-label="Add image">
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
						<button type="button" class="media-btn" aria-label="Add poll">
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
									d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
								/>
							</svg>
						</button>
						<button type="button" class="media-btn" aria-label="Add emoji">
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
									d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</button>
					</div>
					<button type="submit" class="submit-post-btn" disabled={!post_draft.trim() || is_posting}>
						{is_posting ? 'Posting...' : 'Post'}
					</button>
				</div>
			</div>
		</form>

		<!-- Posts -->
		{#each filter_posts() as post (post.id)}
			<article class="post-card">
				<div class="post-header">
					<img src={post.author.avatar_url} alt={post.author.name} class="post-avatar" />
					<div class="post-author-info">
						<div class="post-author-top">
							<span class="post-author-name">{post.author.name}</span>
							{#if post.author.is_verified}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="verified-icon"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clip-rule="evenodd"
									/>
								</svg>
							{/if}
							<span class="post-author-handle">@{post.author.handle}</span>
							<span class="post-dot">·</span>
							<span class="post-timestamp">{post.timestamp}</span>
						</div>
						{#if post.author.role}
							<span class="post-author-role">{post.author.role}</span>
						{/if}
					</div>
					<button class="more-btn" aria-label="More options">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="more-icon"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"
							/>
						</svg>
					</button>
				</div>

				<p class="post-content">{post.content}</p>

				{#if post.images.length === 1}
					<div class="post-images-single">
						<img src={post.images[0]} alt="Post media" class="post-image-single" />
					</div>
				{:else if post.images.length > 1}
					<div class="post-images-grid">
						{#each post.images as src (src)}
							<img {src} alt="Post media" class="post-image-grid" />
						{/each}
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
						<span>{format_count(post.stats.comments)}</span>
					</button>

					<button
						class="action-btn"
						class:action-echo-active={echoed_posts[post.id] ?? false}
						aria-label="Echo"
						onclick={() => toggle_echo(post.id, post.stats.echo_count)}
					>
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
						<span>{format_count(echo_count_override[post.id] ?? post.stats.echo_count)}</span>
					</button>

					<button
						class="action-btn"
						class:action-like-active={liked_posts[post.id] ?? false}
						aria-label="Like"
						onclick={() => toggle_like(post.id, post.stats.likes)}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="action-icon"
							fill={(liked_posts[post.id] ?? false) ? 'currentColor' : 'none'}
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
						<span>{format_count(like_count_override[post.id] ?? post.stats.likes)}</span>
					</button>

					<button class="action-btn action-share" aria-label="Share">
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
								d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13"
							/>
						</svg>
					</button>
				</div>
			</article>
		{/each}
	</main>

	<!-- RIGHT SIDEBAR -->
	<aside class="right-sidebar">
		<div class="sidebar-card">
			<h3 class="sidebar-card-title">Trending Now</h3>
			<ul class="trending-list">
				{#each data.trending as trend (trend.tag)}
					<li class="trending-item">
						<span class="trending-category">{trend.category}</span>
						<span class="trending-tag">{trend.tag}</span>
						<span class="trending-count">{trend.count} Echoes</span>
					</li>
				{/each}
			</ul>
			<button class="show-more-btn">Show more</button>
		</div>

		<div class="sidebar-card">
			<h3 class="sidebar-card-title">Who to Follow</h3>
			<ul class="follow-list">
				{#each data.who_to_follow as user (user.handle)}
					{@const is_following = followed_users[user.handle] ?? false}
					<li class="follow-item">
						<img src={user.avatar_url} alt={user.name} class="follow-avatar" />
						<div class="follow-info">
							<span class="follow-name">{user.name}</span>
							<span class="follow-handle">@{user.handle}</span>
						</div>
						<button
							class="follow-btn"
							class:follow-btn-active={is_following}
							onclick={() => toggle_follow(user.handle)}
						>
							{is_following ? 'Following' : 'Follow'}
						</button>
					</li>
				{/each}
			</ul>
			<button class="show-more-btn">Show more</button>
		</div>

		<footer class="sidebar-footer">
			<a href={resolve('/terms')}>Terms of Service</a>
			<a href={resolve('/privacy')}>Privacy Policy</a>
			<a href={resolve('/cookies')}>Cookie Policy</a>
			<span>© 2026 Y.</span>
		</footer>
	</aside>
</div>
