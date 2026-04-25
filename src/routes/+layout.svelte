<script lang="ts">
	import './layout.css'
	import { navigating } from '$app/state'
	import HomeSkeleton from '$lib/components/HomeSkeleton.svelte'
	import ProfileSkeleton from '$lib/components/ProfileSkeleton.svelte'

	const { children } = $props()

	const dest = $derived(navigating.to?.url.pathname ?? null)
	const is_same_page = $derived(dest !== null && dest === (navigating.from?.url.pathname ?? null))
</script>

{#if dest && !is_same_page}
	{#if dest === '/home'}
		<HomeSkeleton />
	{:else if dest.startsWith('/profile/')}
		<ProfileSkeleton />
	{:else}
		<div class="nav-progress" aria-hidden="true"></div>
	{/if}
{:else}
	{@render children()}
{/if}
