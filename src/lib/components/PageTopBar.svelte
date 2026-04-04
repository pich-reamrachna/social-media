<script lang="ts">
	type TopBarTab = {
		id: string
		label: string
	}

	const {
		title,
		tabs = [],
		active_tab,
		on_change,
		extra_class = ''
	}: {
		title?: string
		tabs?: TopBarTab[]
		active_tab?: string
		on_change?: (tab_id: string) => void
		extra_class?: string
	} = $props()
</script>

<div class={`feed-topbar ${extra_class}`.trim()}>
	{#if title}
		<div class="topbar-title-wrap">
			<span class="topbar-title">{title}</span>
		</div>
	{/if}

	{#if tabs.length > 0}
		<div class="feed-tabs" role="tablist" aria-label={`${title ?? 'Page'} tabs`}>
			{#each tabs as tab (tab.id)}
				<button
					type="button"
					role="tab"
					aria-selected={active_tab === tab.id}
					class="tab-btn"
					class:tab-active={active_tab === tab.id}
					onclick={() => on_change?.(tab.id)}
				>
					{tab.label}
				</button>
			{/each}
		</div>
	{/if}
</div>
