<script lang="ts">
	import './layout.css'
	import { navigating } from '$app/state'
	import { afterNavigate } from '$app/navigation'
	import HomeSkeleton from '$lib/components/HomeSkeleton.svelte'
	import ProfileSkeleton from '$lib/components/ProfileSkeleton.svelte'

	const { children } = $props()

	afterNavigate(({ type }) => {
		if (type === 'enter') window.scrollTo({ top: 0, behavior: 'instant' })
	})

	const dest = $derived(navigating.to?.url.pathname ?? null)
	const is_same_page = $derived(dest !== null && dest === (navigating.from?.url.pathname ?? null))

	let show_skeleton = $state(false)

	$effect(() => {
		let timer: ReturnType<typeof setTimeout> | undefined

		if (dest && !is_same_page) {
			timer = setTimeout(() => {
				show_skeleton = true
			}, 200)
		} else {
			show_skeleton = false
		}

		return () => {
			clearTimeout(timer)
			show_skeleton = false
		}
	})
</script>

{#if show_skeleton}
	{#if dest === '/home'}
		<HomeSkeleton />
	{:else if dest?.startsWith('/profile/')}
		<ProfileSkeleton />
	{:else}
		<div class="nav-progress" aria-hidden="true"></div>
	{/if}
{:else}
	{@render children()}
{/if}
