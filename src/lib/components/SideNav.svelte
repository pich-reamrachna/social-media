<script lang="ts">
	import { resolve } from '$app/paths'
	import { enhance } from '$app/forms'
	import './SideNav.css'

	type User = {
		name: string
		handle: string
		avatar_url: string
	}

	type NavItem = {
		label: string
		path: string
		icon: string
	}

	const { current_user, active_route, is_settings_open, on_settings_toggle } = $props<{
		current_user: User
		active_route: string
		is_settings_open?: boolean
		on_settings_toggle?: () => void
	}>()

	const nav_items = $derived.by<NavItem[]>(() => [
		{
			label: 'Home',
			path: '/home',
			icon: 'M3 12l9-8 9 8v8a2 2 0 01-2 2h-4v-6H9v6H5a2 2 0 01-2-2z'
		},
		{
			label: 'Explore',
			path: '/explore',
			icon: 'M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z'
		},
		{
			label: 'Notifications',
			path: '/notifications',
			icon: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0h6z'
		},
		{
			label: 'Messages',
			path: '/messages',
			icon: 'M8 10h8M8 14h5m-9 6h16a2 2 0 002-2V6a2 2 0 00-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2z'
		},
		{
			label: 'Profile',
			path: `/profile/${current_user?.handle || ''}`,
			icon: 'M16 14a4 4 0 10-8 0 6 6 0 00-4 5.2V20h16v-.8A6 6 0 0016 14z'
		}
	])

	const mobile_nav_start: NavItem[] = [
		{
			label: 'Home',
			path: '/home',
			icon: 'M3 12l9-8 9 8v8a2 2 0 01-2 2h-4v-6H9v6H5a2 2 0 01-2-2z'
		},
		{
			label: 'Explore',
			path: '/explore',
			icon: 'M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z'
		}
	]

	const mobile_nav_end = $derived.by<NavItem[]>(() => [
		{
			label: 'Notifications',
			path: '/notifications',
			icon: 'M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 11-6 0h6z'
		},
		{
			label: 'Profile',
			path: `/profile/${current_user?.handle || ''}`,
			icon: 'M16 14a4 4 0 10-8 0 6 6 0 00-4 5.2V20h16v-.8A6 6 0 0016 14z'
		}
	])
</script>

<nav class="side-nav">
	<div class="side-nav-top">
		<div class="side-nav-logo">
			<div class="side-nav-logo-mark">Y</div>
			<div class="side-nav-logo-sub">The Platform you didn't know existed.</div>
		</div>

		<div class="side-nav-links">
			{#each nav_items as item (item.path)}
				<a
					href={resolve(item.path as '/')}
					class="side-nav-item"
					class:active={active_route === resolve(item.path as '/')}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						class="side-nav-icon"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						stroke-width="1.9"
					>
						<path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
					</svg>
					<span>{item.label}</span>
				</a>
			{/each}
		</div>
	</div>

	<div class="side-nav-bottom">
		<div class="side-nav-settings-wrap">
			<button
				type="button"
				class="side-nav-settings-btn"
				class:active={is_settings_open}
				aria-label="Settings"
				aria-expanded={is_settings_open}
				onclick={on_settings_toggle}
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					class="side-nav-settings-icon"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
					/>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
					/>
				</svg>
				<span>Settings</span>
			</button>

			{#if is_settings_open}
				<div class="side-nav-settings-menu">
					<form
						method="POST"
						action="?/signOut"
						use:enhance={() => {
							on_settings_toggle?.()
						}}
					>
						<button type="submit" class="side-nav-settings-action">Logout</button>
					</form>
				</div>
			{/if}
		</div>

		{#if current_user}
			<a
				href={resolve(`/profile/${current_user.handle}` as '/')}
				class="side-nav-user flex w-full items-center rounded-full p-3 text-inherit no-underline transition-colors hover:bg-white/5"
			>
				<img src={current_user.avatar_url} alt={current_user.name} class="side-nav-user-avatar" />
				<div class="side-nav-user-info">
					<div class="side-nav-user-name">{current_user.name}</div>
					<div class="side-nav-user-handle">@{current_user.handle}</div>
				</div>
			</a>
		{/if}
	</div>
</nav>

<nav class="mobile-bottom-nav" aria-label="Mobile navigation">
	{#each mobile_nav_start as item (item.path)}
		<a
			href={resolve(item.path as '/')}
			class="mobile-nav-item"
			class:active={active_route === resolve(item.path as '/')}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="mobile-nav-icon"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1.9"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
			</svg>
			<span>{item.label}</span>
		</a>
	{/each}

	<button
		type="button"
		class="mobile-nav-item mobile-nav-settings"
		class:active={is_settings_open}
		aria-label="Settings"
		aria-expanded={is_settings_open}
		onclick={on_settings_toggle}
	>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			class="mobile-nav-icon"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="1.9"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
			/>
			<path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
		</svg>
		<span>Settings</span>
	</button>

	{#each mobile_nav_end as item (item.path)}
		<a
			href={resolve(item.path as '/')}
			class="mobile-nav-item"
			class:active={active_route === resolve(item.path as '/')}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="mobile-nav-icon"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="1.9"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d={item.icon} />
			</svg>
			<span>{item.label}</span>
		</a>
	{/each}
</nav>

{#if is_settings_open}
	<div class="mobile-settings-menu">
		<form
			method="POST"
			action="?/signOut"
			use:enhance={() => {
				on_settings_toggle?.()
			}}
		>
			<button type="submit" class="mobile-settings-action">Logout</button>
		</form>
	</div>
{/if}
