<script lang="ts">
	import RightSidebar from '$lib/components/RightSidebar.svelte'

	let search_query = $state('')
	const followed_users = $state<Record<string, boolean>>({})

	const trending = [
		{ category: 'TECHNOLOGY · TRENDING', tag: '#NeuralInterface', count: '45.2K' },
		{ category: 'ART · TRENDING', tag: '#DigitalNoir', count: '12.9K' },
		{ category: 'MUSIC · TRENDING', tag: 'Synthetix Core', count: '8.1K' }
	]

	const who_to_follow = [
		{
			name: 'Billie Eilish',
			handle: 'billieeilish',
			avatar_url: 'https://i.pravatar.cc/150?img=5'
		},
		{
			name: 'Bad Bunny',
			handle: 'badbunnypr',
			avatar_url: 'https://i.pravatar.cc/150?img=60'
		}
	]

	function toggle_follow(handle: string) {
		followed_users[handle] = !(followed_users[handle] ?? false)
	}
</script>

<div class="profile-shell">
	<section class="profile-content">
		<h1>Profile</h1>
		<p>Profile page</p>
	</section>

	<RightSidebar
		{trending}
		{who_to_follow}
		{search_query}
		{followed_users}
		on_search_change={(value) => (search_query = value)}
		on_toggle_follow={toggle_follow}
	/>
</div>

<style>
	.profile-shell {
		display: grid;
		grid-template-columns: 1fr 300px;
		min-height: 100vh;
		background-color: #0d0d0d;
		color: #f3f4f6;
	}

	.profile-content {
		padding: 1.5rem;
	}

	@media (max-width: 1024px) {
		.profile-shell {
			grid-template-columns: 1fr;
		}

		.profile-content {
			order: 2;
		}

		:global(.profile-shell .right-sidebar) {
			order: 1;
			position: static;
			height: auto;
			overflow: visible;
			border-bottom: 1px solid #1f1f1f;
		}
	}
</style>
