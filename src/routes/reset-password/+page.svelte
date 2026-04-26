<script lang="ts">
	import { enhance } from '$app/forms'
	import { resolve } from '$app/paths'
	import type { ActionData, PageData } from './$types'
	import { MIN_PASSWORD_LENGTH } from '$lib/constants/auth'

	let { data, form }: { data: PageData; form: ActionData } = $props()

	let password = $state('')
	let confirm_password = $state('')

	let is_show_password = $state(false)
	let is_updating = $state(false)

	let password_status = $state<'idle' | 'invalid' | 'valid'>('idle')
	let password_message = $state('')

	let confirm_password_status = $state<'idle' | 'invalid' | 'valid'>('idle')
	let confirm_password_message = $state('')

	const validate_password = (value: string) => {
		if (!value) {
			password_status = 'idle'
			password_message = ''
			return
		}

		const errors: string[] = []

		if (value.length < MIN_PASSWORD_LENGTH)
			errors.push(`be at least ${MIN_PASSWORD_LENGTH} characters`)
		if (!/[a-z]/.test(value)) errors.push('contain lowercase')
		if (!/[A-Z]/.test(value)) errors.push('contain uppercase')
		if (!/\d/.test(value)) errors.push('contain a number')
		if (!/[^A-Za-z0-9]/.test(value)) errors.push('contain a symbol')

		if (errors.length > 0) {
			password_status = 'invalid'
			password_message = `Password must ${errors.join(', ')}`
			return
		}

		password_status = 'valid'
		password_message = 'Valid Password'
	}

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

	// Check if the form should be disabled
	let has_errors = $derived(
		password_status === 'invalid' ||
			confirm_password_status === 'invalid' ||
			!password ||
			!confirm_password
	)
</script>

<div
	class="flex min-h-screen items-center justify-center overflow-x-hidden bg-[#0d0d0d] p-4 font-sans text-gray-100 selection:bg-pink-500 selection:text-white"
>
	<div
		class="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden"
	>
		<div class="h-125 w-125 rounded-full bg-pink-900/10 blur-[100px]"></div>
	</div>

	<div
		class="z-10 w-full max-w-md rounded-[24px] border border-[#1f1f1f] bg-[#111111] p-8 shadow-2xl sm:p-10"
	>
		<div class="mb-8 text-center">
			<h1 class="mb-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">Reset Password</h1>
			<p class="text-sm text-gray-400">
				Create a new password for your <span
					class="bg-linear-to-br from-[#ff3377] to-[#ff7eb3] bg-clip-text font-bold text-transparent italic"
					>Y</span
				> account.
			</p>
		</div>

		<form
			method="POST"
			class="space-y-6"
			use:enhance={() => {
				is_updating = true
				return async ({ update }) => {
					try {
						await update()
					} finally {
						is_updating = false
					}
				}
			}}
		>
			<input type="hidden" name="token" value={data.token} />

			{#if form?.error_message}
				<div
					class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-center text-sm text-red-200"
				>
					{form.error_message}
				</div>
			{/if}

			<div>
				<label
					for="password"
					class="mb-3 block text-[10px] font-medium tracking-widest text-gray-500 uppercase"
				>
					New Password
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
					Confirm New Password
				</label>
				<div class="relative">
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
				</div>
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

			<div class="pt-4">
				<button
					type="submit"
					disabled={has_errors || is_updating}
					class="w-full cursor-pointer rounded-full bg-linear-to-r from-[#ff3377] to-[#ff7eb3] px-4 py-3.5 font-semibold text-white shadow-[0_0_20px_rgba(255,51,119,0.3)] transition-all hover:scale-[1.01] hover:shadow-[0_0_25px_rgba(255,51,119,0.5)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 disabled:hover:shadow-none"
				>
					{#if is_updating}
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
						Updating Password...
					{:else}
						Update Password
					{/if}
				</button>
			</div>
		</form>

		<div class="mt-8 border-t border-[#1f1f1f] pt-6 text-center">
			<a
				href={resolve('/login')}
				class="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-500 transition-colors hover:text-[#ff7eb3]"
			>
				<span>&larr;</span> Back to Login
			</a>
		</div>
	</div>
</div>
