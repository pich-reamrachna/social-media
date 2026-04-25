<script lang="ts">
	import './RightSidebar.css'
	import { fly } from 'svelte/transition'
	import SearchDropdown from '$lib/components/SearchDropdown.svelte'

	import { type FollowUser, type TrendingItem } from '$lib/types'

	const {
		trending,
		who_to_follow,
		search_query = '',
		search_users = [],
		on_search_change,
		on_open_profile,
		on_apply_keyword_search,
		on_toggle_follow,
		is_footer_visible = true
	} = $props<{
		trending: TrendingItem[]
		who_to_follow: FollowUser[]
		search_query?: string
		search_users?: FollowUser[]
		on_search_change?: (value: string) => void
		on_open_profile?: (handle: string) => void
		on_apply_keyword_search?: () => void
		on_toggle_follow?: (user_id: string) => Promise<void>
		is_footer_visible?: boolean
	}>()

	let trending_limit = $state(3)
	let show_more_count = $state(3)
	let who_to_follow_list = $state<FollowUser[]>([])
	let shown_ids = $state(new Set<string>())
	let is_refreshing = $state(false)
	const follow_pending = $state<Record<string, boolean>>({})

	$effect(() => {
		const filtered = who_to_follow.filter((u: FollowUser) => !u.is_following)
		who_to_follow_list = filtered
		shown_ids = new Set(filtered.map((u: FollowUser) => u.id))
	})

	const toggle_trending_limit = () => {
		trending_limit =
			trending_limit >= trending.length ? 3 : Math.min(trending.length, trending_limit + 3)
	}

	const toggle_who_to_follow_limit = () => {
		show_more_count =
			show_more_count >= who_to_follow_list.length
				? 3
				: Math.min(who_to_follow_list.length, show_more_count + 3)
	}

	async function handle_follow(user_id: string) {
		if (follow_pending[user_id]) return
		follow_pending[user_id] = true
		shown_ids = new Set([...shown_ids, user_id])
		who_to_follow_list = who_to_follow_list.filter((u) => u.id !== user_id)
		try {
			await on_toggle_follow?.(user_id)
		} finally {
			follow_pending[user_id] = false
		}
	}

	async function refresh_suggestions() {
		if (is_refreshing) return
		is_refreshing = true
		try {
			const exclude = [...shown_ids].join(',')
			const response = await fetch(`/api/suggestions?exclude=${encodeURIComponent(exclude)}`)
			if (!response.ok) return
			const data = (await response.json()) as { users: FollowUser[] }
			if (data.users.length > 0) {
				who_to_follow_list = [...who_to_follow_list, ...data.users]
				shown_ids = new Set([...shown_ids, ...data.users.map((u) => u.id)])
			}
		} finally {
			is_refreshing = false
		}
	}
</script>

<aside class="right-sidebar">
	{#if on_search_change}
		<SearchDropdown
			extra_class="sidebar-search-group"
			{search_query}
			{search_users}
			aria_label="Search"
			{on_search_change}
			{...on_open_profile ? { on_open_profile } : {}}
			{...on_apply_keyword_search ? { on_apply_keyword_search } : {}}
		/>
	{/if}

	<div class="sidebar-card">
		<h3 class="sidebar-card-title">Trending Now</h3>
		<ul class="trending-list">
			{#each trending.slice(0, trending_limit) as trend (trend.tag)}
				<li class="trending-item">
					<span class="trending-category">{trend.category}</span>
					<span class="trending-tag">{trend.tag}</span>
					<span class="trending-count">{trend.count} Echoes</span>
				</li>
			{/each}
		</ul>
		{#if trending.length > 3}
			<button class="show-more-btn" onclick={toggle_trending_limit}>
				{trending_limit >= trending.length ? 'Show less' : 'Show more'}
			</button>
		{/if}
	</div>

	<div class="sidebar-card">
		<h3 class="sidebar-card-title">Who to Follow</h3>
		{#if who_to_follow_list.length > 0}
			<ul class="follow-list">
				{#each who_to_follow_list.slice(0, show_more_count) as user (user.id)}
					<li
						class="follow-item"
						in:fly={{ x: -24, duration: 300 }}
						out:fly={{ x: 24, duration: 400 }}
					>
						<button
							type="button"
							class="follow-profile-link"
							onclick={() => on_open_profile?.(user.handle)}
						>
							<img src={user.avatar_url} alt={user.name} class="follow-avatar" />
							<div class="follow-info">
								<span class="follow-name">{user.name}</span>
								<span class="follow-handle">@{user.handle}</span>
							</div>
						</button>
						<button
							class="follow-btn"
							disabled={follow_pending[user.id]}
							onclick={() => handle_follow(user.id)}
						>
							Follow
						</button>
					</li>
				{/each}
			</ul>
			{#if who_to_follow_list.length > 3}
				<button class="show-more-btn" onclick={toggle_who_to_follow_limit}>
					{show_more_count >= who_to_follow_list.length ? 'Show less' : 'Show more'}
				</button>
			{/if}
		{:else}
			<p class="no-suggestions-text">You've followed everyone here.</p>
		{/if}
		<button class="show-more-btn" disabled={is_refreshing} onclick={refresh_suggestions}>
			{is_refreshing ? 'Finding people...' : 'Find more people'}
		</button>
	</div>

	{#if is_footer_visible}
		<footer class="sidebar-footer">
			<span>© 2026 Y.</span>
		</footer>
	{/if}
</aside>
