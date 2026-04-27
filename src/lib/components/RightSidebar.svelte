<script lang="ts">
	import './RightSidebar.css'
	import { fly } from 'svelte/transition'
	import SearchDropdown from '$lib/components/SearchDropdown.svelte'

	import { SvelteSet } from 'svelte/reactivity'
	import { type FollowUser } from '$lib/types'

	const {
		who_to_follow,
		search_query = '',
		search_users = [],
		on_search_change,
		on_open_profile,
		on_apply_keyword_search,
		on_toggle_follow,
		is_footer_visible = true
	} = $props<{
		who_to_follow: FollowUser[]
		search_query?: string
		search_users?: FollowUser[]
		on_search_change?: (value: string) => void
		on_open_profile?: (handle: string) => void
		on_apply_keyword_search?: () => void
		on_toggle_follow?: (user_id: string) => Promise<boolean>
		is_footer_visible?: boolean
	}>()

	let show_more_count = $state(3)
	const recently_followed = new SvelteSet<string>()
	const dismissed_users = new SvelteSet<string>()
	const follow_pending = $state<Record<string, boolean>>({})
	const FOLLOW_CONFIRMATION_DURATION_MS = 900

	const who_to_follow_list = $derived.by(() =>
		who_to_follow.filter(
			(u: FollowUser) =>
				(!u.is_following || recently_followed.has(u.id)) && !dismissed_users.has(u.id)
		)
	)

	const toggle_who_to_follow_limit = () => {
		show_more_count =
			show_more_count >= who_to_follow_list.length
				? 3
				: Math.min(who_to_follow_list.length, show_more_count + 3)
	}

	async function handle_follow(user_id: string) {
		if (follow_pending[user_id] || recently_followed.has(user_id)) return
		follow_pending[user_id] = true
		try {
			const did_toggle = await on_toggle_follow?.(user_id)
			if (!did_toggle) return
			recently_followed.add(user_id)
			setTimeout(() => {
				recently_followed.delete(user_id)
				dismissed_users.add(user_id)
			}, FOLLOW_CONFIRMATION_DURATION_MS)
		} catch {
			recently_followed.delete(user_id)
		} finally {
			follow_pending[user_id] = false
		}
	}
</script>

<aside class="right-sidebar">
	{#if on_search_change}
		<SearchDropdown
			input_id="search-sidebar"
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
							type="button"
							class="follow-btn"
							class:follow-btn-active={recently_followed.has(user.id)}
							disabled={follow_pending[user.id] || recently_followed.has(user.id)}
							aria-busy={follow_pending[user.id]}
							onclick={() => handle_follow(user.id)}
						>
							{#if follow_pending[user.id]}
								Following...
							{:else if recently_followed.has(user.id)}
								Following
							{:else}
								Follow
							{/if}
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
			<p class="no-suggestions-text">No more suggestions for now.</p>
		{/if}
	</div>

	{#if is_footer_visible}
		<footer class="sidebar-footer">
			<span>© 2026 Y.</span>
		</footer>
	{/if}
</aside>
