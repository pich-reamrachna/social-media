<script lang="ts">
	import { deserialize, enhance } from '$app/forms'
	import { resolve } from '$app/paths'

	import SideNav from '$lib/components/SideNav.svelte'
	import Post from '$lib/components/Post.svelte'
	import '../../home/home.css'
	import '$lib/components/RightSidebar.css'

	import type { PageData } from './$types'
	const { data }: { data: PageData } = $props()
	type ProfilePost = (typeof data.posts)[number]

	let active_tab = $state<'Posts' | 'media' | 'liked posts'>('Posts')
	let is_settings_open = $state(false)
	let profile_posts = $state<ProfilePost[]>([])
	let profile_liked_posts = $state<ProfilePost[]>([])
	let is_liked_posts_loading = $state(false)
	let has_loaded_liked_posts = $state(false)
	let liked_posts = $state<Record<string, boolean>>({})
	let like_count_override = $state<Record<string, number>>({})

	const followed_users = $state<Record<string, boolean>>({})

	// Modal States
	let is_edit_modal_open = $state(false)
	let is_saving_profile = $state(false)
	let form_error = $state('')
	let avatar_preview = $state('')
	let banner_preview = $state('')

	$effect(() => {
		profile_posts = [...data.posts]
		profile_liked_posts = []
		has_loaded_liked_posts = false
		is_liked_posts_loading = false
		liked_posts = {}
		like_count_override = {}
	})

	function format_join_date(dateString: Date | string) {
		if (!dateString) return 'Unknown Date'
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
	}

	function handle_file_preview(event: Event, type: 'avatar' | 'banner') {
		const input = event.target as HTMLInputElement
		if (!input.files || input.files.length === 0) return

		const file = input.files[0]
		if (!file) return

		const url = URL.createObjectURL(file)
		if (type === 'avatar') avatar_preview = url
		if (type === 'banner') banner_preview = url
	}

	const displayed_posts = $derived.by(() => {
		if (active_tab === 'liked posts') {
			return profile_liked_posts
		}
		if (active_tab === 'media') {
			return profile_posts.filter((p) => p.images && p.images.length > 0)
		}
		return profile_posts
	})

	async function ensure_liked_posts_loaded() {
		if (has_loaded_liked_posts || is_liked_posts_loading) return

		is_liked_posts_loading = true

		try {
			const form_data = new FormData()
			const response = await fetch('?/loadLikedPosts', {
				method: 'POST',
				body: form_data
			})
			const result = deserialize(await response.text())
			if (result.type === 'failure' || result.type === 'error') {
				throw new Error()
			}

			const payload =
				result.type === 'success'
					? (result.data as { liked_posts?: ProfilePost[] } | undefined)
					: undefined

			profile_liked_posts = payload?.liked_posts ?? []
			has_loaded_liked_posts = true
		} catch {
			profile_liked_posts = []
		} finally {
			is_liked_posts_loading = false
		}
	}

	function select_tab(tab: 'Posts' | 'media' | 'liked posts') {
		active_tab = tab
		if (tab === 'liked posts') {
			void ensure_liked_posts_loaded()
		}
	}

	function update_local_post_state(post_id: string, is_next_liked: boolean, next_likes: number) {
		const update_post = (p: ProfilePost) => {
			if (p.id !== post_id) return p
			return {
				...p,
				is_liked_by_user: is_next_liked,
				stats: { ...p.stats, likes: next_likes }
			}
		}

		profile_posts = profile_posts.map(update_post)
		profile_liked_posts = profile_liked_posts.map(update_post)
	}

	function sync_owner_liked_posts(post: ProfilePost, post_id: string, is_liked: boolean) {
		if (!data.is_owner) return

		if (!is_liked) {
			profile_liked_posts = profile_liked_posts.filter((p) => p.id !== post_id)
			return
		}

		if (profile_liked_posts.some((p) => p.id === post_id)) return
		profile_liked_posts = [post, ...profile_liked_posts]
	}

	async function toggle_like(post_id: string) {
		const post =
			profile_posts.find((p) => p.id === post_id) ||
			profile_liked_posts.find((p) => p.id === post_id)
		if (!post) return

		const is_liked = liked_posts[post_id] ?? post.is_liked_by_user
		const likes = like_count_override[post_id] ?? post.stats.likes
		const is_next_liked = !is_liked
		const next_likes = is_next_liked ? likes + 1 : Math.max(0, likes - 1)

		liked_posts[post_id] = is_next_liked
		like_count_override[post_id] = next_likes
		update_local_post_state(post_id, is_next_liked, next_likes)

		const optimistic_owner_post: ProfilePost = {
			...post,
			is_liked_by_user: is_next_liked,
			stats: { ...post.stats, likes: next_likes }
		}
		sync_owner_liked_posts(optimistic_owner_post, post_id, is_next_liked)

		const form_data = new FormData()
		form_data.append('postId', post_id)

		try {
			const response = await fetch('?/toggleLike', {
				method: 'POST',
				body: form_data
			})
			const result = deserialize(await response.text())
			if (result.type === 'failure' || result.type === 'error') throw new Error()
		} catch {
			liked_posts[post_id] = is_liked
			like_count_override[post_id] = likes
			update_local_post_state(post_id, is_liked, likes)

			sync_owner_liked_posts(post, post_id, is_liked)
		}
	}

	function toggle_follow(handle: string): void {
		followed_users[handle] = !(followed_users[handle] ?? false)
	}
</script>

<div class="home-shell">
	{#if data.current_user}
		<SideNav
			current_user={data.current_user}
			active_route={resolve(`/profile/${data.profile.handle}`)}
			{is_settings_open}
			on_settings_toggle={() => (is_settings_open = !is_settings_open)}
		/>
	{/if}

	<main class="feed-column">
		<header
			class="sticky top-0 z-20 flex items-center justify-between border-b border-[#1f1f1f] bg-[#0d0d0d]/98 px-4 backdrop-blur-md"
		>
			<div class="flex items-center">
				<span
					class="border-b-2 border-[#ff3377] py-4 text-[0.8rem] font-bold tracking-widest text-[#ff3377] uppercase"
				>
					Profile
				</span>
			</div>
		</header>

		<div class="h-48 w-full overflow-hidden bg-[#111]">
			{#if data.profile.banner_url}
				<img src={data.profile.banner_url} alt="" class="h-full w-full object-cover" />
			{/if}
		</div>

		<div class="relative flex items-start justify-between px-4">
			<img
				src={data.profile.avatar_url}
				alt={data.profile.name}
				class="z-10 -mt-15 h-30 w-30 rounded-full border-4 border-[#0d0d0d] bg-[#1f1f1f] object-cover"
				onerror={(e) => {
					;(e.currentTarget as HTMLImageElement).src =
						`https://i.pravatar.cc/150?u=${data.profile.id}`
				}}
			/>

			<div class="mt-3">
				{#if data.is_owner}
					<button
						onclick={() => (is_edit_modal_open = true)}
						class="cursor-pointer rounded-full border border-[#f3f4f6] bg-[#f3f4f6] px-4 py-1.5 text-sm font-bold text-[#0d0d0d] transition-colors hover:bg-white/90"
					>
						Edit Profile
					</button>
				{:else}
					<button
						class="cursor-pointer rounded-full border border-[#f3f4f6] bg-[#f3f4f6] px-4 py-1.5 text-sm font-bold text-[#0d0d0d] transition-colors hover:bg-white/90"
					>
						Follow
					</button>
				{/if}
			</div>
		</div>

		<div class="px-4 pt-3 pb-4">
			<h1 class="m-0 text-2xl leading-tight font-extrabold">{data.profile.name}</h1>
			<span class="text-[0.95rem] text-[#6b7280]">@{data.profile.handle}</span>

			<p class="my-3 text-[0.9375rem] leading-[1.6] text-[#e5e7eb]">
				{data.profile.bio}
			</p>

			<div class="mb-3 flex flex-wrap gap-4 text-[0.85rem] text-[#6b7280]">
				<span class="flex items-center gap-1">📍 Phnom Penh, Cambodia</span>
				<span class="flex items-center gap-1"
					>📅 Joined {format_join_date(data.profile.joined_date)}</span
				>
			</div>
		</div>

		<nav class="mt-2 flex justify-around border-b border-[#1f1f1f]">
			{#each ['Posts', 'media', 'liked posts'] as tab (tab)}
				<button
					class="relative flex-1 cursor-pointer py-4 text-[0.8rem] font-semibold tracking-[0.08em] uppercase transition-colors hover:bg-white/5
                           {active_tab === tab ? 'text-[#f3f4f6]' : 'text-[#6b7280]'}"
					onclick={() => select_tab(tab as 'Posts' | 'media' | 'liked posts')}
				>
					{tab}
					{#if active_tab === tab}
						<div
							class="absolute bottom-0 left-1/2 h-0.75 w-3/5 -translate-x-1/2 rounded-t-md bg-[#ff3377]"
						></div>
					{/if}
				</button>
			{/each}
		</nav>

		<div class="pb-12">
			{#if active_tab === 'liked posts' && is_liked_posts_loading}
				<div class="p-10 text-center text-[#6b7280]">
					<p>Loading liked posts...</p>
				</div>
			{:else}
				{#each displayed_posts as post (post.id)}
					<Post
						name={post.author.name}
						handle={post.author.handle ?? 'unknown-user'}
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

			{#if !is_liked_posts_loading && displayed_posts.length === 0}
				<div class="p-10 text-center text-[#6b7280]">
					<p>No posts found here.</p>
				</div>
			{/if}
		</div>
	</main>

	<aside class="right-sidebar">
		{#if data.trending && data.trending.length > 0}
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
		{/if}

		{#if data.who_to_follow && data.who_to_follow.length > 0}
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
		{/if}

		<footer class="sidebar-footer">
			<a href={resolve('/terms')}>Terms of Service</a>
			<a href={resolve('/privacy')}>Privacy Policy</a>
			<a href={resolve('/cookies')}>Cookie Policy</a>
			<span>© 2026 Y.</span>
		</footer>
	</aside>

	{#if is_edit_modal_open && data.is_owner}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0d0d]/80 px-4 backdrop-blur-sm"
		>
			<div class="w-full max-w-150 overflow-hidden rounded-2xl bg-[#161616] shadow-2xl">
				<form
					method="POST"
					action="?/updateProfile"
					enctype="multipart/form-data"
					use:enhance={() => {
						is_saving_profile = true
						form_error = ''
						return async ({ result, update }) => {
							is_saving_profile = false
							if (result.type === 'success') {
								is_edit_modal_open = false
								avatar_preview = ''
								banner_preview = ''
							} else if (result.type === 'failure') {
								form_error =
									result.data &&
									typeof result.data === 'object' &&
									'message' in result.data &&
									typeof result.data.message === 'string'
										? result.data.message
										: 'Failed to save profile'
							}
							await update()
						}
					}}
				>
					<div class="flex items-center justify-between border-b border-[#333] px-4 py-3">
						<div class="flex items-center gap-6">
							<button
								type="button"
								aria-label="Close edit profile modal"
								class="cursor-pointer text-gray-400 transition-colors hover:text-white"
								onclick={() => {
									is_edit_modal_open = false
									avatar_preview = ''
									banner_preview = ''
									form_error = ''
								}}
							>
								<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
							</button>
							<h2 class="text-lg font-bold text-[#f3f4f6]">Edit Profile</h2>
						</div>
						<button
							type="submit"
							disabled={is_saving_profile}
							class="cursor-pointer rounded-full bg-linear-to-r from-[#ff3377] to-[#ff5588] px-5 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
						>
							{is_saving_profile ? 'SAVING...' : 'SAVE'}
						</button>
					</div>

					{#if form_error}
						<div class="bg-red-500/10 px-4 py-2 text-center text-sm font-medium text-red-500">
							{form_error}
						</div>
					{/if}

					<div class="max-h-[80vh] overflow-y-auto pb-8">
						<div class="group relative h-48 w-full bg-[#222]">
							<img
								src={banner_preview || data.profile.banner_url}
								alt="Banner"
								class="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-50"
							/>

							<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
								<div class="rounded-full bg-black/60 p-3 text-white backdrop-blur-md">
									<svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
										/>
									</svg>
								</div>
							</div>
							<input
								type="file"
								name="banner"
								accept=".jpg,.jpeg,.png,.gif,.webp"
								class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
								onchange={(e) => handle_file_preview(e, 'banner')}
							/>
						</div>

						<div class="relative px-4">
							<div
								class="group relative -mt-16 inline-block h-32 w-32 rounded-full border-4 border-[#161616] bg-[#222]"
							>
								<img
									src={avatar_preview || data.profile.avatar_url}
									alt="Avatar"
									class="h-full w-full rounded-full object-cover opacity-70 transition-opacity group-hover:opacity-50"
								/>

								<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
									<div class="rounded-full bg-black/60 p-2 text-white backdrop-blur-md">
										<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
											/>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
											/>
										</svg>
									</div>
								</div>
								<input
									type="file"
									name="avatar"
									accept=".jpg,.jpeg,.png,.gif,.webp"
									class="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
									onchange={(e) => handle_file_preview(e, 'avatar')}
								/>
							</div>
						</div>

						<div class="mt-4 space-y-5 px-4">
							<div class="flex flex-col">
								<label
									for="name"
									class="mb-1 text-[0.7rem] font-bold tracking-wider text-[#6b7280] uppercase"
								>
									Displayed Name
								</label>
								<input
									id="name"
									name="name"
									type="text"
									value={data.profile.name}
									class="rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-3 text-[0.95rem] text-[#f3f4f6] focus:border-[#ff3377] focus:ring-1 focus:ring-[#ff3377] focus:outline-none"
									required
								/>
							</div>

							<div class="flex flex-col">
								<label
									for="bio"
									class="mb-1 text-[0.7rem] font-bold tracking-wider text-[#6b7280] uppercase"
								>
									Bio
								</label>
								<textarea
									id="bio"
									name="bio"
									rows="3"
									class="resize-none rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-3 text-[0.95rem] text-[#f3f4f6] focus:border-[#ff3377] focus:ring-1 focus:ring-[#ff3377] focus:outline-none"
									value={data.profile.bio === 'This user has no bio yet.' ? '' : data.profile.bio}
								></textarea>
							</div>
						</div>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>
