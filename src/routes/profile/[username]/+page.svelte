<script lang="ts">
	import { deserialize } from '$app/forms'
	import { resolve } from '$app/paths'

	import SideNav from '$lib/components/SideNav.svelte'
	import Post from '$lib/components/Post.svelte'
	import '../../home/home.css'

	import type { PageData } from './$types'
	const { data }: { data: PageData } = $props()
	type ProfilePost = (typeof data.posts)[number]

	let active_tab = $state<'Posts' | 'media' | 'liked posts'>('Posts')
	let profile_posts = $state<ProfilePost[]>([])
	let profile_liked_posts = $state<ProfilePost[]>([])
	let liked_posts = $state<Record<string, boolean>>({})
	let like_count_override = $state<Record<string, number>>({})

	const followed_users = $state<Record<string, boolean>>({})

	$effect(() => {
		profile_posts = [...data.posts]
		profile_liked_posts = [...(data.liked_posts ?? [])]
		liked_posts = {}
		like_count_override = {}
	})

	function format_join_date(dateString: Date | string) {
		if (!dateString) return 'Unknown Date'
		const date = new Date(dateString)
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
	}

	// THIS IS THE FIX: Move the filter logic out of the HTML and into a $derived rune
	const displayed_posts = $derived.by(() => {
		if (active_tab === 'liked posts') {
			return profile_liked_posts
		}
		if (active_tab === 'media') {
			return profile_posts.filter((p) => p.images && p.images.length > 0)
		}
		return profile_posts
	})

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

		// On your own profile, keep "liked posts" tab in sync instantly.
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

		<div
			class="h-48 w-full bg-[#111] bg-cover bg-center"
			style="background-image: url('{data.profile.banner_url}');"
		></div>

		<div class="relative flex items-start justify-between px-4">
			<img
				src={data.profile.avatar_url}
				alt={data.profile.name}
				class="z-10 -mt-15 h-30 w-30 rounded-full border-4 border-[#0d0d0d] bg-[#1f1f1f] object-cover"
				onerror={(e) =>
					((e.currentTarget as HTMLImageElement).src =
						`https://i.pravatar.cc/150?u=${data.profile.id}`)}
			/>

			<div class="mt-3">
				{#if data.is_owner}
					<button
						class="rounded-full border border-[#f3f4f6] bg-[#f3f4f6] px-4 py-1.5 text-sm font-bold text-[#0d0d0d] transition-colors hover:bg-white/90"
					>
						Edit Profile
					</button>
				{:else}
					<button
						class="rounded-full border border-[#f3f4f6] bg-[#f3f4f6] px-4 py-1.5 text-sm font-bold text-[#0d0d0d] transition-colors hover:bg-white/90"
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
					class="relative flex-1 py-4 text-[0.8rem] font-semibold tracking-[0.08em] uppercase transition-colors hover:bg-white/5
                           {active_tab === tab ? 'text-[#f3f4f6]' : 'text-[#6b7280]'}"
					onclick={() => (active_tab = tab as 'Posts' | 'media' | 'liked posts')}
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
			{#each displayed_posts as post (post.id)}
				<Post
					name={post.author.name}
					handle={post.author.handle ?? 'unknown-user'}
					content={post.content}
					images={post.images}
					timestamp={post.timestamp}
					likes={like_count_override[post.id] ?? post.stats.likes}
					is_liked={liked_posts[post.id] ?? post.is_liked_by_user}
					on_like={() => toggle_like(post.id)}
				/>
			{/each}

			{#if displayed_posts.length === 0}
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
</div>
