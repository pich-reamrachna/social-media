<script lang="ts">
	import { fly } from 'svelte/transition'
	import { resolve } from '$app/paths'
	import { goto } from '$app/navigation'
	import type { PageData } from './$types'

	const props = $props<{ data: PageData }>()

	type Contributor = {
		id: string
		name: string
		handle: string
		avatar_url: string
		is_following: boolean
		role: string
		note: string
		contributions: string[]
	}

	const contributors = $derived(props.data.contributors as Contributor[])
	const is_authenticated = $derived(props.data.is_authenticated as boolean)
	const current_user_id = $derived(props.data.current_user_id as string | undefined)

	const follow_states = $state<Record<string, boolean>>({})
	const follow_pending = $state<Record<string, boolean>>({})
	let toast = $state<{ type: 'success' | 'error'; message: string; visible: boolean }>({
		type: 'success',
		message: '',
		visible: false
	})

	function show_toast(type: 'success' | 'error', message: string, duration = 3000) {
		toast = { type, message, visible: true }
		setTimeout(() => {
			toast.visible = false
		}, duration)
	}

	function get_is_following(contributor: Contributor): boolean {
		return follow_states[contributor.id] ?? contributor.is_following
	}

	async function handle_follow(contributor: Contributor) {
		if (!is_authenticated) {
			goto(resolve('/login'))
			return
		}
		if (follow_pending[contributor.id]) return

		const did_following = get_is_following(contributor)
		follow_pending[contributor.id] = true

		try {
			const res = await fetch(resolve('/api/follow'), {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId: contributor.id })
			})
			const payload = await res.json()
			if (!res.ok || typeof payload.is_following !== 'boolean') throw new Error()
			follow_states[contributor.id] = payload.is_following
			show_toast('success', payload.is_following ? 'Followed!' : 'Unfollowed')
		} catch {
			follow_states[contributor.id] = did_following
			show_toast('error', 'Failed to update follow')
		} finally {
			follow_pending[contributor.id] = false
		}
	}
</script>

<svelte:head>
	<title>Credits | Y</title>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,600;1,400&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="credits-shell">
	<div class="credits-glow" aria-hidden="true"></div>

	<div class="credits-container">
		{#if toast.visible}
			<div
				class="toast"
				class:toast-success={toast.type === 'success'}
				class:toast-error={toast.type === 'error'}
				role="status"
				aria-live="polite"
			>
				<svg class="toast-icon" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
					{#if toast.type === 'success'}
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					{:else}
						<path
							fill-rule="evenodd"
							d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
							clip-rule="evenodd"
						/>
					{/if}
				</svg>
				<span class="toast-message">{toast.message}</span>
			</div>
		{/if}

		<button
			type="button"
			class="back-link"
			onclick={() => {
				if (history.length > 1) history.back()
				else goto(resolve('/home'))
			}}
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				class="back-icon"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2.5"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
			</svg>
			Back
		</button>

		<header class="credits-header">
			<div class="logo-mark">Y</div>
			<p class="logo-sub">The Platform you didn't know existed.</p>

			<div class="title-row">
				<div class="title-line"></div>
				<h1 class="credits-title">Credits</h1>
				<div class="title-line"></div>
			</div>
			<p class="credits-subtitle">The people who built Y.</p>
		</header>

		<main class="contributors">
			{#each contributors as contributor, i (contributor.id)}
				<article class="contributor-card" in:fly={{ y: 24, duration: 380, delay: i * 100 }}>
					<div class="card-profile-row">
						<a href={resolve(`/profile/${contributor.handle}`)} class="profile-link">
							<img src={contributor.avatar_url} alt={contributor.name} class="contributor-avatar" />
							<div class="profile-text">
								<span class="contributor-name">{contributor.name}</span>
								<span class="contributor-handle">@{contributor.handle}</span>
								<span class="contributor-role">{contributor.role}</span>
							</div>
						</a>

						{#if current_user_id !== contributor.id}
							<button
								type="button"
								class="follow-btn"
								class:follow-btn-following={get_is_following(contributor)}
								disabled={follow_pending[contributor.id]}
								aria-busy={follow_pending[contributor.id]}
								onclick={() => handle_follow(contributor)}
							>
								{#if follow_pending[contributor.id]}
									{get_is_following(contributor) ? 'Unfollowing...' : 'Following...'}
								{:else if get_is_following(contributor)}
									<span class="follow-label-default">Following</span>
									<span class="follow-label-hover">Unfollow</span>
								{:else}
									Follow
								{/if}
							</button>
						{/if}
					</div>

					<div class="card-body" class:has-note={!!contributor.note}>
						{#if contributor.note}
							<aside class="contributor-note">
								<p class="note-text">{contributor.note}</p>
							</aside>
						{/if}
						<ul class="contributions-list">
							{#each contributor.contributions as item (item)}
								<li class="contribution-item">
									<span class="contribution-dot" aria-hidden="true"></span>
									{item}
								</li>
							{/each}
						</ul>
					</div>
				</article>
			{/each}

			{#if contributors.length === 0}
				<p class="empty-state">No contributors found.</p>
			{/if}
		</main>

		<footer class="credits-footer">
			<span>© 2026 Y.</span>
		</footer>
	</div>
</div>

<style>
	.credits-shell {
		min-height: 100dvh;
		background-color: #0d0d0d;
		color: #f3f4f6;
		position: relative;
		overflow: hidden;
	}

	.credits-glow {
		position: absolute;
		top: -120px;
		left: 50%;
		transform: translateX(-50%);
		width: 600px;
		height: 400px;
		background: radial-gradient(ellipse at center, rgba(255, 51, 119, 0.07) 0%, transparent 70%);
		pointer-events: none;
	}

	.credits-container {
		position: relative;
		z-index: 1;
		margin: 0 auto;
		max-width: 72rem;
		padding: 3rem 1.25rem 4rem;
	}

	.back-link {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: #6b7280;
		text-decoration: none;
		margin-bottom: 3rem;
		transition: color 0.15s;
		background: none;
		border: none;
		padding: 0;
		cursor: pointer;
		font-family: inherit;
	}

	.back-link:hover {
		color: #d1d5db;
	}

	.back-icon {
		width: 0.85rem;
		height: 0.85rem;
	}

	.credits-header {
		text-align: center;
		margin-bottom: 3.5rem;
	}

	.logo-mark {
		font-size: 5rem;
		font-weight: 900;
		font-style: italic;
		line-height: 1;
		letter-spacing: -0.04em;
		background: linear-gradient(to bottom right, #ff3377, #ff7eb3);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
		margin-bottom: 0.25rem;
	}

	.logo-sub {
		font-size: 0.6rem;
		font-weight: 500;
		letter-spacing: 0.22em;
		text-transform: uppercase;
		color: #4b5563;
		margin-bottom: 2.5rem;
	}

	.title-row {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 0.75rem;
	}

	.title-line {
		flex: 1;
		height: 1px;
		background: linear-gradient(to right, transparent, #262626);
	}

	.title-line:last-child {
		background: linear-gradient(to left, transparent, #262626);
	}

	.credits-title {
		font-family: 'Cormorant Garamond', Georgia, serif;
		font-size: clamp(2.75rem, 8vw, 4.5rem);
		font-weight: 300;
		font-style: italic;
		letter-spacing: -0.01em;
		color: #f9fafb;
		line-height: 1;
		margin: 0;
	}

	.credits-subtitle {
		font-size: 0.8rem;
		color: #4b5563;
		letter-spacing: 0.05em;
	}

	.contributors {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 1rem;
	}

	@media (max-width: 640px) {
		.contributors {
			grid-template-columns: 1fr;
		}
	}

	.contributor-card {
		background-color: #111111;
		border: 1px solid #1f1f1f;
		border-radius: 1.125rem;
		padding: 1.25rem 1.375rem;
		transition:
			border-color 0.2s,
			background-color 0.2s;
	}

	.contributor-card:hover {
		border-color: #2a2a2a;
		background-color: #141414;
	}

	.card-profile-row {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.profile-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		flex: 1;
		min-width: 0;
		text-decoration: none;
	}

	.contributor-avatar {
		width: 4rem;
		height: 4rem;
		border-radius: 9999px;
		object-fit: cover;
		background-color: #1f1f1f;
		flex-shrink: 0;
		outline: 2px solid transparent;
		outline-offset: 2px;
		transition: outline-color 0.2s;
	}

	.profile-link:hover .contributor-avatar {
		outline-color: rgba(255, 51, 119, 0.5);
	}

	.profile-text {
		display: flex;
		flex-direction: column;
		min-width: 0;
		gap: 0.1rem;
	}

	.contributor-name {
		font-size: 0.9rem;
		font-weight: 600;
		color: #f3f4f6;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		transition: color 0.15s;
	}

	.profile-link:hover .contributor-name {
		color: #ffffff;
	}

	.contributor-handle {
		font-size: 0.75rem;
		color: #6b7280;
	}

	.card-body {
		border-top: 1px solid #1f1f1f;
		padding-top: 0.875rem;
	}

	.card-body.has-note {
		display: grid;
		grid-template-columns: 1fr 1.5fr;
		gap: 1rem;
	}

	.contributor-note {
		padding-right: 1rem;
		border-right: 1px solid #1f1f1f;
	}

	.note-text {
		font-size: 0.82rem;
		color: #6b7280;
		font-style: italic;
		line-height: 1.7;
		margin: 0;
	}

	.follow-btn {
		flex-shrink: 0;
		margin-left: auto;
		border-radius: 9999px;
		padding: 0.375rem 1.1rem;
		font-size: 0.78rem;
		font-weight: 700;
		letter-spacing: 0.02em;
		border: 1px solid #f3f4f6;
		background: #f3f4f6;
		color: #0d0d0d;
		cursor: pointer;
		transition:
			border-color 0.15s,
			color 0.15s,
			background 0.15s,
			opacity 0.15s;
		font-family: inherit;
	}

	.follow-btn.follow-btn-following {
		border-color: #333;
		background: transparent;
		color: #ffffff;
	}

	.follow-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.toast {
		position: fixed;
		top: 1.5rem;
		right: 1.5rem;
		z-index: 9999;
		display: inline-flex;
		align-items: center;
		gap: 0.625rem;
		padding: 0.75rem 1rem;
		background: #1c1c1c;
		border: 1px solid #2e2e2e;
		border-left: 3px solid #4b5563;
		border-radius: 0.625rem;
		box-shadow:
			0 4px 6px rgba(0, 0, 0, 0.4),
			0 12px 28px rgba(0, 0, 0, 0.5);
		font-size: 0.9rem;
		font-weight: 500;
		color: #f3f4f6;
		width: auto;
		max-width: min(22rem, calc(100vw - 3rem));
		animation: toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
	}

	.toast-success {
		border-left-color: #22c55e;
	}

	.toast-error {
		border-left-color: #ef4444;
	}

	.toast-icon {
		width: 1.125rem;
		height: 1.125rem;
		flex-shrink: 0;
	}

	.toast-message {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	@keyframes toastIn {
		from {
			transform: translateX(calc(100% + 1.5rem));
			opacity: 0;
		}
		to {
			transform: translateX(0);
			opacity: 1;
		}
	}

	@media (max-width: 640px) {
		.toast {
			top: 1rem;
			right: 1rem;
			left: 1rem;
			max-width: none;
		}
	}

	.follow-label-default {
		display: block;
	}

	.follow-label-hover {
		display: none;
	}

	.follow-btn:hover:not(:disabled) {
		background: rgba(243, 244, 246, 0.9);
	}

	.follow-btn.follow-btn-following:hover:not(:disabled),
	.follow-btn.follow-btn-following:focus-visible:not(:disabled),
	.follow-btn.follow-btn-following:active:not(:disabled) {
		border-color: #ef4444;
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	.follow-btn.follow-btn-following:hover:not(:disabled) .follow-label-default,
	.follow-btn.follow-btn-following:focus-visible:not(:disabled) .follow-label-default,
	.follow-btn.follow-btn-following:active:not(:disabled) .follow-label-default {
		display: none;
	}

	.follow-btn.follow-btn-following:hover:not(:disabled) .follow-label-hover,
	.follow-btn.follow-btn-following:focus-visible:not(:disabled) .follow-label-hover,
	.follow-btn.follow-btn-following:active:not(:disabled) .follow-label-hover {
		display: block;
	}

	.contributor-role {
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.15em;
		text-transform: uppercase;
		color: #ff5c8d;
		margin-top: 0.2rem;
	}

	.contributions-list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.contribution-item {
		display: flex;
		align-items: flex-start;
		gap: 0.625rem;
		font-size: 0.85rem;
		color: #9ca3af;
		line-height: 1.4;
	}

	.contribution-dot {
		margin-top: 0.45em;
		width: 0.3rem;
		height: 0.3rem;
		flex-shrink: 0;
		border-radius: 9999px;
		background-color: rgba(255, 51, 119, 0.4);
	}

	.empty-state {
		text-align: center;
		font-size: 0.875rem;
		color: #4b5563;
		padding: 3rem 0;
	}

	.credits-footer {
		margin-top: 4rem;
		text-align: center;
		font-size: 0.75rem;
		color: #374151;
	}
</style>
