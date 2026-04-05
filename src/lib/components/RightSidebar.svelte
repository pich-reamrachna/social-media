<script lang="ts">
	import { resolve } from '$app/paths'
	import './RightSidebar.css'

	type TrendingItem = {
		category: string
		tag: string
		count: string
	}

	type FollowUser = {
		name: string
		handle: string
		avatar_url: string
	}

	const {
		trending,
		who_to_follow,
		search_query = '',
		followed_users = {},
		on_search_change,
		on_toggle_follow,
		is_footer_visible = true
	} = $props<{
		trending: TrendingItem[]
		who_to_follow: FollowUser[]
		search_query?: string
		followed_users?: Record<string, boolean>
		on_search_change?: (value: string) => void
		on_toggle_follow?: (handle: string) => void
		is_footer_visible?: boolean
	}>()
</script>

<aside class="right-sidebar">
	<div class="search-group sidebar-search-group">
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
			type="text"
			value={search_query}
			oninput={(e) => on_search_change?.((e.target as HTMLInputElement).value)}
			placeholder="Search"
			aria-label="Search"
			class="search-input"
		/>
	</div>

	<div class="sidebar-card">
		<h3 class="sidebar-card-title">Trending Now</h3>
		<ul class="trending-list">
			{#each trending as trend (trend.tag)}
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
			{#each who_to_follow as user (user.handle)}
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
						onclick={() => on_toggle_follow?.(user.handle)}
					>
						{is_following ? 'Following' : 'Follow'}
					</button>
				</li>
			{/each}
		</ul>
		<button class="show-more-btn">Show more</button>
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
