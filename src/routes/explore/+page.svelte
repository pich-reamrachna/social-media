<script lang="ts">
	import { browser } from '$app/environment'
	import { goto } from '$app/navigation'
	import { resolve } from '$app/paths'
	import SideNav from '$lib/components/SideNav.svelte'

	type ExploreUser = {
		id: string
		name: string
		username: string
		avatar_url: string
	}

	type ExploreData = {
		query: string
		current_user: {
			name: string
			handle: string
			avatar_url: string
		}
		users: ExploreUser[]
	}

	const { data } = $props<{ data: ExploreData }>()

	let search_query = $derived(data.query)

	$effect(() => {
		if (!browser) return

		const next_query = search_query.trim()
		if (next_query === data.query) return

		const timer = setTimeout(() => {
			void goto(resolve(next_query ? `/explore?q=${encodeURIComponent(next_query)}` : '/explore'), {
				replaceState: true,
				noScroll: true,
				keepFocus: true,
				invalidateAll: true
			})
		}, 300)

		return () => clearTimeout(timer)
	})

	function open_profile(username: string) {
		void username
		void goto(resolve('/profile'))
	}
</script>

<div class="explore-shell">
	<SideNav current_user={data.current_user} active_route={resolve('/explore')} />

	<main class="explore-main">
		<header class="explore-header">
			<h1>Explore users</h1>
			<p>Search by username or display name.</p>
		</header>

		<div class="search-box">
			<input
				type="search"
				bind:value={search_query}
				placeholder="Search username..."
				aria-label="Search users"
			/>
		</div>

		<div class="results-meta">
			<span>{data.users.length} result{data.users.length === 1 ? '' : 's'}</span>
		</div>

		{#if data.users.length === 0}
			<div class="empty-state">
				No users found for "{search_query.trim()}".
			</div>
		{:else}
			<ul class="users-list">
				{#each data.users as user (user.id)}
					<li class="user-card">
						<button type="button" class="user-card-btn" onclick={() => open_profile(user.username)}>
							<img src={user.avatar_url} alt={user.name} class="avatar" />
							<div class="user-details">
								<p class="name">{user.name}</p>
								<p class="username">@{user.username}</p>
							</div>
						</button>
					</li>
				{/each}
			</ul>
		{/if}
	</main>
</div>

<style>
	.explore-shell {
		display: flex;
		min-height: 100vh;
		background: linear-gradient(180deg, #0b1220 0%, #111b2f 100%);
	}

	.explore-main {
		flex: 1;
		max-width: 740px;
		margin: 0 auto;
		padding: 1.5rem;
		color: #f8fafc;
	}

	.explore-header h1 {
		margin: 0;
		font-size: 1.75rem;
	}

	.explore-header p {
		margin-top: 0.35rem;
		color: #cbd5e1;
	}

	.search-box {
		margin-top: 1rem;
	}

	.search-box input {
		width: 100%;
		padding: 0.8rem 1rem;
		border-radius: 999px;
		border: 1px solid #334155;
		background: rgba(15, 23, 42, 0.7);
		color: #f8fafc;
		outline: none;
	}

	.search-box input:focus {
		border-color: #38bdf8;
	}

	.results-meta {
		margin-top: 0.8rem;
		color: #94a3b8;
		font-size: 0.9rem;
	}

	.users-list {
		list-style: none;
		padding: 0;
		margin: 1rem 0 0;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.user-card {
		padding: 0;
		border: 1px solid #1e293b;
		border-radius: 0.85rem;
		background: rgba(15, 23, 42, 0.72);
		overflow: hidden;
	}

	.user-card-btn {
		width: 100%;
		display: flex;
		align-items: center;
		gap: 0.85rem;
		padding: 0.8rem 0.95rem;
		border: none;
		background: transparent;
		color: inherit;
		text-align: left;
		cursor: pointer;
	}

	.user-card-btn:hover {
		background: rgba(56, 189, 248, 0.08);
	}

	.avatar {
		width: 44px;
		height: 44px;
		object-fit: cover;
		border-radius: 999px;
	}

	.user-details {
		min-width: 0;
	}

	.name {
		margin: 0;
		font-weight: 600;
	}

	.username {
		margin: 0.15rem 0 0;
		color: #94a3b8;
		font-size: 0.95rem;
	}

	.empty-state {
		margin-top: 1rem;
		padding: 1rem;
		border-radius: 0.8rem;
		background: rgba(15, 23, 42, 0.6);
		border: 1px dashed #334155;
		color: #cbd5e1;
	}

	@media (max-width: 900px) {
		.explore-main {
			padding-bottom: 6rem;
		}
	}
</style>
