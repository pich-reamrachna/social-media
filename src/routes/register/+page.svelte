<script lang="ts">
	import { enhance } from '$app/forms'
	import { resolve } from '$app/paths'
	import type { ActionData } from './$types'
	import { MIN_PASSWORD_LENGTH } from '$lib/constants/auth'

	const { form } = $props<{ form: ActionData }>()

	let email = $derived.by(() => form?.email ?? '')
	let password = $state('')
	let confirm_password = $state('')

	let is_show_password = $state(false)
	let is_signing_up = $state(false)

	let email_status = $state<'idle' | 'invalid' | 'valid'>('idle')
	let email_message = $state('')

	let password_status = $state<'idle' | 'invalid' | 'valid'>('idle')
	let password_message = $state('')

	let confirm_password_status = $state<'idle' | 'invalid' | 'valid'>('idle')
	let confirm_password_message = $state('')

	const check_email = (value: string) => {
		const trimmed = value.trim()

		if (!trimmed) {
			email_status = 'idle'
			email_message = ''
			return
		}

		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
			email_status = 'invalid'
			email_message = 'Invalid Email'
			return
		}

		email_status = 'valid'
		email_message = ''
	}

	const validate_password = (value: string) => {
		if (!value) {
			password_status = 'idle'
			password_message = ''
			return
		}

		const errors: string[] = []

		if (value.length < MIN_PASSWORD_LENGTH) {
			errors.push(`be at least ${MIN_PASSWORD_LENGTH} characters`)
		}

		if (!/[a-z]/.test(value)) {
			errors.push('contain lowercase')
		}

		if (!/[A-Z]/.test(value)) {
			errors.push('contain uppercase')
		}

		if (!/\d/.test(value)) {
			errors.push('contain a number')
		}

		if (!/[^A-Za-z0-9]/.test(value)) {
			errors.push('contain a symbol')
		}

		if (errors.length > 0) {
			password_status = 'invalid'
			password_message = `Password must ${errors.join(', ')}`
			return
		}

		password_status = 'valid'
		password_message = 'Valid Password'
	}

	// eslint-disable-next-line prefer-const
	let has_errors = $derived(
		email_status === 'invalid' ||
			password_status === 'invalid' ||
			confirm_password_status === 'invalid'
	)

	const toggle_password = () => {
		is_show_password = !is_show_password
	}

	const validate_confirm_password = (value: string) => {
		if (!value) {
			confirm_password_status = 'idle'
			confirm_password_message = ''
			return
		}

		if (value !== password) {
			confirm_password_status = 'invalid'
			confirm_password_message = 'Password does not match'
			return
		}

		confirm_password_status = 'valid'
		confirm_password_message = 'Password match!'
	}
</script>

<div
	class="flex min-h-dvh bg-[#0d0d0d] font-sans text-gray-100 selection:bg-pink-500 selection:text-white"
>
	<div
		class="relative hidden flex-col justify-between bg-linear-to-br from-[#1a0f14] via-[#0d0d0d] to-[#0a0a0a] p-16 lg:flex lg:w-1/2"
	>
		<div>
			<h1
				class="mb-4 bg-linear-to-br from-[#ff3377] to-[#ff7eb3] bg-clip-text text-7xl font-extrabold tracking-tighter text-transparent italic"
			>
				Y
			</h1>
			<p class="max-w-xs text-[12px] leading-relaxed tracking-[0.2em] text-gray-500 uppercase">
				The Platform you didn't know existed.
			</p>
		</div>

		<div class="z-10 mb-12">
			<h2 class="mb-6 text-4xl leading-tight font-bold">
				Value your moment <br />
				and time. <span class="text-[#ff5c8d] italic">Share your moment</span> <br />
				and <span class="text-[#ff5c8d] italic">ideas.</span>
			</h2>

			<div class="flex max-w-md items-start gap-4 text-sm text-gray-400">
				<div class="mt-2 h-0.5 w-6 shrink-0 bg-[#ff5c8d]"></div>
				<p>We value your privacy and online safety.</p>
			</div>
		</div>

		<div class="absolute right-16 bottom-16 flex items-end gap-1 opacity-60">
			<div class="h-8 w-1 bg-gray-700"></div>
			<div class="h-16 w-1 bg-gray-600"></div>
			<div class="h-24 w-1 bg-[#ff5c8d]"></div>
			<div class="h-12 w-1 bg-[#ff7eb3]"></div>
			<div class="h-6 w-1 bg-gray-700"></div>
		</div>
	</div>

	<div
		class="flex w-full flex-col items-center justify-center bg-[#111111] px-7 py-6 sm:px-10 sm:py-12 lg:w-1/2 lg:p-24"
	>
		<div class="w-full max-w-md">
			<div class="mb-8 sm:mb-10 lg:hidden">
				<h1
					class="mb-3 bg-linear-to-br from-[#ff3377] to-[#ff7eb3] bg-clip-text text-6xl leading-none font-extrabold tracking-tighter text-transparent italic"
				>
					Y
				</h1>
				<p
					class="max-w-[18rem] text-[11px] leading-relaxed tracking-[0.2em] text-gray-500 uppercase"
				>
					The Platform you didn't know existed.
				</p>
			</div>

			<div class="mb-8 sm:mb-12">
				<h2 class="mb-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
					Join Today
				</h2>
				<p class="text-sm text-gray-400">
					Create your
					<span
						class="bg-linear-to-br from-[#ff3377] to-[#ff7eb3] bg-clip-text font-bold text-transparent italic"
					>
						Y</span
					> profile.
				</p>
			</div>

			<form
				method="POST"
				class="space-y-5 sm:space-y-6"
				use:enhance={() => {
					is_signing_up = true
					return async ({ update }) => {
						try {
							await update()
						} finally {
							is_signing_up = false
						}
					}
				}}
			>
				{#if form?.message}
					<p
						class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
					>
						{form.message}
					</p>
				{/if}

				<div>
					<label
						for="email"
						class="mb-3 block text-[10px] font-medium tracking-widest text-gray-500 uppercase"
					>
						Email
					</label>
					<input
						type="text"
						id="email"
						name="email"
						bind:value={email}
						oninput={(e) => check_email((e.currentTarget as HTMLInputElement).value)}
						placeholder="Type your email address"
						class="w-full rounded-lg border border-gray-800 bg-black px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-[#ff5c8d] focus:ring-1 focus:ring-[#ff5c8d] focus:outline-none"
						required
					/>
					{#if email_message}
						<p class:text-red-400={email_status === 'invalid'} class="mt-2 text-sm break-words">
							{email_message}
						</p>
					{/if}
				</div>

				<div>
					<label
						for="password"
						class="mb-3 block text-[10px] font-medium tracking-widest text-gray-500 uppercase"
					>
						Password
					</label>
					<div class="relative">
						<input
							type={is_show_password ? 'text' : 'password'}
							id="password"
							name="password"
							bind:value={password}
							oninput={(e) => validate_password((e.currentTarget as HTMLInputElement).value)}
							placeholder="••••••••••••"
							class="w-full rounded-lg border border-gray-800 bg-black px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-[#ff5c8d] focus:ring-1 focus:ring-[#ff5c8d] focus:outline-none"
							required
						/>
						<button
							type="button"
							onclick={toggle_password}
							class="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 transition-colors hover:text-gray-300"
						>
							{#if is_show_password}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="h-4 w-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
									/>
								</svg>
							{/if}
						</button>
					</div>
					{#if password_message}
						<p
							class:text-red-400={password_status === 'invalid'}
							class:text-green-400={password_status === 'valid'}
							class="mt-2 text-sm break-words"
						>
							{password_message}
						</p>
					{/if}
				</div>

				<div>
					<label
						for="confirm_password"
						class="mb-3 block text-[10px] font-medium tracking-widest text-gray-500 uppercase"
					>
						Confirm Password
					</label>
					<input
						type={is_show_password ? 'text' : 'password'}
						id="confirm_password"
						name="confirm_password"
						bind:value={confirm_password}
						oninput={(e) => validate_confirm_password((e.currentTarget as HTMLInputElement).value)}
						placeholder="••••••••••••"
						class="w-full rounded-lg border border-gray-800 bg-black px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-[#ff5c8d] focus:ring-1 focus:ring-[#ff5c8d] focus:outline-none"
						required
					/>
					{#if confirm_password_message}
						<p
							class:text-red-400={confirm_password_status === 'invalid'}
							class:text-green-400={confirm_password_status === 'valid'}
							class="mt-2 text-sm break-words"
						>
							{confirm_password_message}
						</p>
					{/if}
				</div>

				<div class="pt-6">
					<button
						type="submit"
						disabled={has_errors || is_signing_up}
						class="w-full rounded-full bg-linear-to-r from-[#ff3377] to-[#ff7eb3] px-4 py-3.5 font-semibold text-white shadow-[0_0_20px_rgba(255,51,119,0.3)] transition-all hover:scale-[1.01] hover:shadow-[0_0_25px_rgba(255,51,119,0.5)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
					>
						{#if is_signing_up}
							<svg
								class="mr-2 inline h-4 w-4 animate-spin"
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
							Creating Account...
						{:else}
							Create Account
						{/if}
					</button>
				</div>
			</form>

			<div class="mt-10 text-center text-sm text-gray-500 sm:mt-12">
				Already have an account?
				<a
					href={resolve('/login')}
					class="ml-1 text-[#ff5c8d] transition-colors hover:text-[#ff7eb3]"
				>
					Sign In Here
				</a>
			</div>
		</div>
	</div>
</div>
