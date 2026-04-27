<script lang="ts">
	import { enhance } from '$app/forms'
	import { goto } from '$app/navigation'
	import type { ActionData } from './$types'

	const { form }: { form: ActionData } = $props()

	let is_loading = $state(false)
	let cooldown_seconds = $state(0)
	let last_processed_timestamp = 0

	let timer_interval: ReturnType<typeof setInterval> | undefined

	$effect(() => {
		// Only start timer if we have a retry_after AND it's a new form submission timestamp
		if (form?.retry_after && form?.timestamp && form.timestamp !== last_processed_timestamp) {
			last_processed_timestamp = form.timestamp
			start_cooldown(form.retry_after)
		} else if (form?.retry_after && !form.timestamp) {
			// Fallback for the rate limit fail block which doesn't send a timestamp
			last_processed_timestamp = Date.now()
			start_cooldown(form.retry_after)
		}

		return () => {
			if (timer_interval) {
				clearInterval(timer_interval)
				timer_interval = undefined
			}
		}
	})

	const start_cooldown = (seconds: number) => {
		cooldown_seconds = seconds
		if (timer_interval) clearInterval(timer_interval)

		timer_interval = setInterval(() => {
			cooldown_seconds -= 1
			if (cooldown_seconds <= 0) {
				clearInterval(timer_interval)
				timer_interval = undefined
			}
		}, 1000)
	}

	const handle_enhance = () => {
		is_loading = true

		return async ({ update }: { update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: false })
			is_loading = false
		}
	}

	const navigate_to_login = () => {
		// eslint-disable-next-line svelte/no-navigation-without-resolve
		goto('/login')
	}
</script>

<div class="flex min-h-screen items-center justify-center bg-[#0a0a0a] p-4">
	<div
		class="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
	>
		<div class="h-125 w-125 rounded-full bg-pink-900/10 blur-[100px]"></div>
	</div>

	<div
		class="z-10 w-full max-w-md rounded-3xl border border-neutral-800 bg-[#121212] p-8 shadow-2xl"
	>
		<div class="mb-8 text-center">
			<h1 class="mb-4 text-4xl font-black tracking-wider text-pink-400 italic">Y</h1>
			<h2 class="mb-2 text-xl font-semibold text-white">Password Recovery</h2>
			<p class="px-4 text-sm leading-relaxed text-neutral-400">
				Enter your email associated with your Y account to receive recovery instructions.
			</p>
		</div>

		<form method="POST" use:enhance={handle_enhance} class="space-y-6">
			<div class="space-y-2">
				<label
					for="email"
					class="pl-1 text-[11px] font-bold tracking-widest text-neutral-500 uppercase"
				>
					Email Address
				</label>
				<div class="relative">
					<input
						id="email"
						name="email"
						type="email"
						placeholder="Enter your email address"
						disabled={is_loading || cooldown_seconds > 0}
						class="w-full rounded-xl border border-neutral-800 bg-black py-3 pr-4 text-white transition-colors placeholder:text-neutral-600 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</div>
			</div>

			{#if form?.error_message}
				<div
					class="rounded-lg border border-red-900/50 bg-red-950/30 p-3 text-center text-sm text-red-400"
				>
					{form.error_message}
				</div>
			{/if}

			{#if form?.success_message}
				<div
					class="rounded-lg border border-green-900/50 bg-green-950/30 p-4 text-center text-sm leading-relaxed text-green-400"
				>
					{form.success_message}
				</div>
			{/if}

			<button
				type="submit"
				disabled={is_loading || cooldown_seconds > 0}
				class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-linear-to-r from-pink-500 to-pink-400 py-3.5 font-bold text-black transition-all hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100"
			>
				{#if is_loading}
					<div
						class="h-5 w-5 animate-spin rounded-full border-2 border-black border-t-transparent"
					></div>
				{:else if cooldown_seconds > 0}
					Wait {cooldown_seconds}s to resend
				{:else}
					Send Recovery Email
				{/if}
			</button>
		</form>

		<div class="mt-8 border-t border-neutral-800 pt-6 text-center">
			<button
				type="button"
				onclick={navigate_to_login}
				class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-neutral-400 transition-colors hover:text-pink-400"
			>
				<span>&larr;</span> Back to Login
			</button>
		</div>
	</div>
</div>
