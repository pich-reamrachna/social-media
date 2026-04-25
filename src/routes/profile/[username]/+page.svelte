<script lang="ts">
	import { deserialize } from '$app/forms'
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import SideNav from '$lib/components/SideNav.svelte'
	import Post from '$lib/components/Post.svelte'
	import RightSidebar from '$lib/components/RightSidebar.svelte'
	import EditProfileForm from '$lib/components/EditProfileForm.svelte'
	import '../../home/home.css'

	import type { PageData } from './$types'
	import {
		type SideNavUser,
		type ProfileData,
		type ProfilePost,
		type TrendingItem
	} from '$lib/types'

	const {
		data
	}: {
		data: PageData & {
			current_user: SideNavUser | undefined
			profile: ProfileData
			posts: ProfilePost[]
			is_owner: boolean
			is_following: boolean
			who_to_follow: SideNavUser[]
			trending: TrendingItem[]
		}
	} = $props()

	let current_user = $state<SideNavUser | undefined>(undefined)
	let who_to_follow = $state<SideNavUser[]>([])
	let active_tab = $state<'Posts' | 'media' | 'liked posts'>('Posts')

	$effect(() => {
		current_user = data.current_user
		who_to_follow = data.who_to_follow
	})
	let is_settings_open = $state(false)
	let profile_posts = $state<ProfilePost[]>([])
	let profile_liked_posts = $state<ProfilePost[]>([])
	let is_liked_posts_loading = $state(false)
	let has_loaded_liked_posts = $state(false)
	let liked_posts = $state<Record<string, boolean>>({})
	let like_count_override = $state<Record<string, number>>({})
	let is_profile_following = $state(false)
	let profile_followers = $state(0)
	let is_follow_pending = $state(false)
	let is_edit_modal_open = $state(false)
	let toast = $state<{
		type: 'success' | 'error'
		message: string
		visible: boolean
	}>({
		type: 'success',
		message: '',
		visible: false
	})

	$effect(() => {
		profile_posts = [...data.posts]
		profile_liked_posts = []
		has_loaded_liked_posts = false
		is_liked_posts_loading = false
		liked_posts = {}
		like_count_override = {}
		is_profile_following = data.is_following
		profile_followers = get_safe_count(data.profile.stats.followers)
	})

	function get_safe_count(count: number) {
		const parsed_count = Number(count)
		return Number.isFinite(parsed_count) ? Math.max(0, parsed_count) : 0
	}

	function format_join_date(date_string: Date | string) {
		if (!date_string) return 'Unknown Date'
		const date = new Date(date_string)
		return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
	}

	function format_stat_count(count: number) {
		return Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(
			get_safe_count(count)
		)
	}

	function get_stat_label(count: number, singular: string, plural: string) {
		return get_safe_count(count) === 1 ? singular : plural
	}

	const displayed_posts = $derived.by(() => {
		if (active_tab === 'liked posts') return profile_liked_posts
		if (active_tab === 'media') return profile_posts.filter((p) => p.images && p.images.length > 0)
		return profile_posts
	})

	async function ensure_liked_posts_loaded() {
		if (has_loaded_liked_posts || is_liked_posts_loading) return
		is_liked_posts_loading = true
		try {
			const response = await fetch('?/load_liked_posts_action', {
				method: 'POST',
				body: new FormData()
			})
			const result = deserialize(await response.text())
			if (result.type === 'failure' || result.type === 'error') throw new Error()
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
		if (tab === 'liked posts') void ensure_liked_posts_loaded()
	}

	function update_local_post_state(post_id: string, is_next_liked: boolean, next_likes: number) {
		const update_post = (p: ProfilePost) => {
			if (p.id !== post_id) return p
			return { ...p, is_liked_by_user: is_next_liked, stats: { ...p.stats, likes: next_likes } }
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

		const optimistic_post: ProfilePost = {
			...post,
			is_liked_by_user: is_next_liked,
			stats: { ...post.stats, likes: next_likes }
		}
		sync_owner_liked_posts(optimistic_post, post_id, is_next_liked)

		const form_data = new FormData()
		form_data.append('postId', post_id)
		try {
			const response = await fetch('?/toggle_like', { method: 'POST', body: form_data })
			const result = deserialize(await response.text())
			if (result.type === 'failure' || result.type === 'error') throw new Error()
		} catch {
			liked_posts[post_id] = is_liked
			like_count_override[post_id] = likes
			update_local_post_state(post_id, is_liked, likes)
			sync_owner_liked_posts(post, post_id, is_liked)
		}
	}

	function update_current_user_following(delta: number) {
		if (!current_user) return
		current_user = {
			...current_user,
			stats: {
				followers: current_user.stats?.followers ?? 0,
				following: Math.max(0, (current_user.stats?.following ?? 0) + delta)
			}
		}
	}

	function sync_viewed_profile_follow_state(user_id: string, is_following: boolean) {
		if (user_id !== data.profile.id) return

		const follower_delta = is_following === is_profile_following ? 0 : is_following ? 1 : -1
		is_profile_following = is_following
		profile_followers = get_safe_count(profile_followers + follower_delta)
	}

	function show_toast(type: 'success' | 'error', message: string, duration = 3000) {
		toast = { type, message, visible: true }
		setTimeout(() => {
			toast.visible = false
		}, duration)
	}

	async function toggle_profile_follow() {
		if (is_follow_pending) return
		const did_follow = is_profile_following
		is_follow_pending = true

		const form_data = new FormData()
		form_data.append('userId', data.profile.id)
		try {
			const response = await fetch('?/toggle_follow', { method: 'POST', body: form_data })
			const result = deserialize(await response.text())
			if (result.type !== 'success') throw new Error()
			const payload = result.data as { is_following?: boolean }
			const is_following_payload = payload.is_following
			if (typeof is_following_payload !== 'boolean') throw new Error()
			is_profile_following = !!is_following_payload
			profile_followers = get_safe_count(profile_followers + (is_following_payload ? 1 : -1))
			update_current_user_following(is_following_payload ? 1 : -1)
			if (is_following_payload) {
				who_to_follow = who_to_follow.filter((user) => user.id !== data.profile.id)
			}
			show_toast('success', is_following_payload ? 'Followed!' : 'Unfollowed')
		} catch {
			// keep the previous follow state on failure
			is_profile_following = did_follow
			show_toast('error', 'Failed to update follow')
		} finally {
			is_follow_pending = false
		}
	}

	async function sidebar_toggle_follow(user_id: string) {
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

			const is_following_payload = payload.is_following
			update_current_user_following(is_following_payload ? 1 : -1)
			sync_viewed_profile_follow_state(user_id, is_following_payload)
			show_toast('success', is_following_payload ? 'Followed!' : 'Unfollowed')
			return true
		} catch (error) {
			show_toast(
				'error',
				error instanceof Error && error.message ? error.message : 'Failed to update follow'
			)
			return false
		}
	}

	function open_profile(handle: string) {
		void goto(resolve(`/profile/${handle}`))
	}
</script>

<div class="home-shell">
	{#if toast.visible}
		<div
			class="toast"
			class:toast-success={toast.type === 'success'}
			class:toast-error={toast.type === 'error'}
			role="status"
			aria-live="polite"
		>
			<span class="toast-message">{toast.message}</span>
		</div>
	{/if}

	{#if current_user}
		<SideNav
			{current_user}
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
						class="cursor-pointer rounded-full border border-[#f3f4f6] bg-[#f3f4f6] px-4 py-1.5 text-sm font-bold text-[#0d0d0d] transition-colors hover:bg-white/90"
						onclick={() => (is_edit_modal_open = true)}
					>
						Edit Profile
					</button>
				{:else}
					<button
						class="follow-btn"
						class:follow-btn-active={is_profile_following}
						class:follow-btn-pending={is_follow_pending}
						disabled={is_follow_pending}
						aria-busy={is_follow_pending}
						onclick={toggle_profile_follow}
					>
						{#if is_follow_pending}
							{is_profile_following ? 'Unfollowing...' : 'Following...'}
						{:else if is_profile_following}
							<span class="follow-text">Following</span>
							<span class="unfollow-text">Unfollow</span>
						{:else}
							<span>Follow</span>
						{/if}
					</button>
				{/if}
			</div>
		</div>

		<div class="px-4 pt-3 pb-4">
			<h1 class="m-0 text-2xl leading-tight font-extrabold">{data.profile.name}</h1>
			<span class="text-[0.95rem] text-[#6b7280]">@{data.profile.handle}</span>

			<p
				class="my-3 text-[0.9375rem] leading-[1.6] wrap-break-word whitespace-pre-wrap text-[#e5e7eb]"
			>
				{data.profile.bio}
			</p>

			<div class="mb-3 flex flex-wrap gap-4 text-[0.85rem] text-[#6b7280]">
				<span class="flex items-center gap-1">📍 Phnom Penh, Cambodia</span>
				<span class="flex items-center gap-1"
					>📅 Joined {format_join_date(data.profile.joined_date)}</span
				>
			</div>

			<div class="flex flex-wrap gap-x-4 gap-y-1 text-[0.9rem] text-[#e5e7eb]">
				<span class="whitespace-nowrap">
					<strong class="font-bold text-[#f3f4f6] tabular-nums">
						{format_stat_count(data.profile.stats.following)}
					</strong>
					{get_stat_label(data.profile.stats.following, 'Following', 'Following')}
				</span>
				<span class="whitespace-nowrap">
					<strong class="font-bold text-[#f3f4f6] tabular-nums">
						{format_stat_count(profile_followers)}
					</strong>
					{get_stat_label(profile_followers, 'Follower', 'Followers')}
				</span>
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

	<RightSidebar
		trending={data.trending}
		{who_to_follow}
		on_open_profile={open_profile}
		on_toggle_follow={sidebar_toggle_follow}
	/>

	{#if is_edit_modal_open && data.is_owner}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0d0d]/80 px-4 backdrop-blur-sm"
		>
			<div class="w-full max-w-150 overflow-hidden rounded-2xl bg-[#161616] shadow-2xl">
				<EditProfileForm
					action="?/updateProfile"
					can_close
					profile={{
						name: data.profile.name,
						username: data.profile.handle ?? '',
						bio: data.profile.bio === 'This user has no bio yet.' ? '' : data.profile.bio,
						banner_url: data.profile.banner_url,
						avatar_url: data.profile.avatar_url
					}}
					on_close={() => (is_edit_modal_open = false)}
				/>
			</div>
		</div>
	{/if}
</div>
