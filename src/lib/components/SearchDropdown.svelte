<script lang="ts">
	import './SearchDropdown.css'

	type SearchUser = {
		name: string
		handle: string
		avatar_url: string
	}

	const {
		search_query = '',
		search_users = [],
		on_search_change,
		on_open_profile,
		on_apply_keyword_search,
		extra_class = '',
		aria_label = 'Search'
	} = $props<{
		search_query?: string
		search_users?: SearchUser[]
		on_search_change?: (value: string) => void
		on_open_profile?: (handle: string) => void
		on_apply_keyword_search?: () => void
		extra_class?: string
		aria_label?: string
	}>()
</script>

<div class={`search-dropdown ${extra_class}`.trim()}>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class="search-dropdown-icon"
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
		oninput={(e) => on_search_change?.((e.target as HTMLInputElement).value)}
		placeholder="Search"
		aria-label={aria_label}
		class="search-dropdown-input"
	/>
	{#if search_query.trim()}
		<div class="search-dropdown-results">
			{#if search_users.length > 0}
				<div class="search-dropdown-section">
					<p class="search-dropdown-heading">Users</p>
					<ul>
						{#each search_users as user (user.handle)}
							<li>
								<button
									type="button"
									class="search-dropdown-item"
									onclick={() => on_open_profile?.(user.handle)}
								>
									<img src={user.avatar_url} alt={user.name} />
									<span class="search-dropdown-meta">
										<strong>{user.name}</strong>
										<small>@{user.handle}</small>
									</span>
								</button>
							</li>
						{/each}
					</ul>
				</div>
			{/if}

			<div class="search-dropdown-section">
				<p class="search-dropdown-heading">Posts</p>
				<ul>
					<li>
						<button
							type="button"
							class="search-dropdown-item search-dropdown-keyword-item"
							onclick={() => on_apply_keyword_search?.()}
						>
							<span class="search-dropdown-meta">
								<strong>Search Keyword "{search_query.trim()}"</strong>
								<small>Filter posts matching this keyword</small>
							</span>
						</button>
					</li>
				</ul>
			</div>
		</div>
	{/if}
</div>
