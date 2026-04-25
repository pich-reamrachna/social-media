<script lang="ts">
	import { resolve } from '$app/paths'
	import './RightSidebar.css'
	import SearchDropdown from '$lib/components/SearchDropdown.svelte'

	import { type FollowUser, type TrendingItem } from '$lib/types'

	const {
		trending,
		who_to_follow,
		search_query = '',
		search_users = [],
		followed_users = {},
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
		followed_users?: Record<string, boolean>
		on_search_change?: (value: string) => void
		on_open_profile?: (handle: string) => void
		on_apply_keyword_search?: () => void
		on_toggle_follow?: (handle: string) => void
		is_footer_visible?: boolean
	}>()
	let trending_limit = $state(3)
	let show_more_count = $state(3)
</script>

<aside class="right-sidebar">
	<SearchDropdown
		extra_class="sidebar-search-group"
		{search_query}
		{search_users}
		aria_label="Search"
		{on_search_change}
		{on_open_profile}
		{on_apply_keyword_search}
	/>

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
		{#if trending.length > trending_limit}
			<button class="show-more-btn" onclick={() => (trending_limit += 3)}>Show more</button>
		{/if}
	</div>

	<div class="sidebar-card">
		<h3 class="sidebar-card-title">Who to Follow</h3>
		<ul class="follow-list">
			{#each who_to_follow.slice(0, show_more_count) as user (user.id)}
				{@const is_following = followed_users[user.id] ?? user.is_following ?? false}
				<li class="follow-item">
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
						class:follow-btn-active={is_following}
						onclick={() => on_toggle_follow?.(user.id)}
						data-following={is_following ? 'Following' : 'Follow'}
						data-unfollow="Unfollow"
					>
						<span class="follow-text">{is_following ? 'Following' : 'Follow'}</span>
						{#if is_following}
							<span class="unfollow-text">Unfollow</span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
		{#if who_to_follow.length > show_more_count}
			<button class="show-more-btn" onclick={() => (show_more_count += 3)}>Show more</button>
		{/if}
	</div>

	{#if is_footer_visible}
		<footer class="sidebar-footer">
			<a href={resolve('/terms')}>Terms of Service</a>
			<a href={resolve('/privacy')}>Privacy Policy</a>
			<a href={resolve('/cookies')}>Cookie Policy</a>
			<span>© 2026 Y.</span>
		</footer>
	{/if}
</aside>
