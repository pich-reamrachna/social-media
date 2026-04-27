<script lang="ts">
	import { resolve } from '$app/paths'
	import type { SideNavUser } from '$lib/types'
	import './SideNav.css'

	let is_logging_out = $state(false)

	type NavItem = {
		label: string
		path: string
		icon: string
	}

	const { current_user, active_route, is_settings_open, on_settings_toggle } = $props<{
		current_user: SideNavUser
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
			label: 'Profile',
			path: `/profile/${current_user?.handle || ''}`,
			icon: 'M5.121 17.804A9 9 0 0112 15a9 9 0 016.879 2.804M15 11a3 3 0 11-6 0 3 3 0 016 0z'
		}
	])

	const mobile_nav_start: NavItem[] = [
		{
			label: 'Home',
			path: '/home',
			icon: 'M3 12l9-8 9 8v8a2 2 0 01-2 2h-4v-6H9v6H5a2 2 0 01-2-2z'
		}
	]

	const mobile_nav_end = $derived.by<NavItem[]>(() => [
		{
			label: 'Profile',
			path: `/profile/${current_user?.handle || ''}`,
			icon: `${current_user?.avatar_url}`
		}
	])

	const logout_action = resolve('/logout')

	$effect(() => {
		if (!is_settings_open) return

		const handle = (e: MouseEvent) => {
			if (
				(e.target as Element).closest(
					'.side-nav-settings-wrap, .mobile-nav-settings, .mobile-settings-menu'
				)
			)
				return
			on_settings_toggle?.()
		}

		window.addEventListener('click', handle)
		return () => window.removeEventListener('click', handle)
	})
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
					<form method="POST" action={logout_action} onsubmit={() => (is_logging_out = true)}>
						<button type="submit" class="side-nav-settings-action" disabled={is_logging_out}>
							<span class="logout-action-content">
								<svg
									class="logout-spin-icon"
									class:hidden={!is_logging_out}
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
									aria-hidden="true"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
									></path>
								</svg>
								<span class="logout-action-label"
									>{is_logging_out ? 'Logging out...' : 'Logout'}</span
								>
							</span>
						</button>
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
					<div class="side-nav-user-handle">@{current_user.handle || 'user'}</div>
					<div class="side-nav-user-stats">
						<span><strong>{current_user.stats?.following ?? 0}</strong> Following</span>
						<span><strong>{current_user.stats?.followers ?? 0}</strong> Followers</span>
					</div>
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
			<img src={item.icon} alt={item.label} class="mobile-nav-icon-avatar" />

			<span>{item.label}</span>
		</a>
	{/each}
</nav>

{#if is_settings_open}
	<div class="mobile-settings-menu">
		<form method="POST" action={logout_action} onsubmit={() => (is_logging_out = true)}>
			<button type="submit" class="mobile-settings-action" disabled={is_logging_out}>
				<span class="logout-action-content">
					<svg
						class="logout-spin-icon"
						class:hidden={!is_logging_out}
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						aria-hidden="true"
					>
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
						></circle>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
						></path>
					</svg>
					<span class="logout-action-label">{is_logging_out ? 'Logging out...' : 'Logout'}</span>
				</span>
			</button>
		</form>
	</div>
{/if}
