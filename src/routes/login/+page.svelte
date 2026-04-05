<script lang="ts">
	import { resolve } from '$app/paths'
	import type { ActionData } from './$types'

	let username = $state('')
	let password = $state('')
	let should_remember_me = $state(false)
	let is_show_password = $state(false)

	const { form } = $props<{ form: ActionData }>()

	// toggle show password
	const toggle_password = () => {
		is_show_password = !is_show_password
	}
</script>

<div
	class="flex min-h-dvh flex-col bg-[#0d0d0d] font-sans text-gray-100 selection:bg-pink-500 selection:text-white lg:flex-row"
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
		<!-- The 5 columns -->
		<div class="absolute right-16 bottom-16 flex items-end gap-1 opacity-60">
			<div class="h-8 w-1 bg-gray-700"></div>
			<div class="h-16 w-1 bg-gray-600"></div>
			<div class="h-24 w-1 bg-[#ff5c8d]"></div>
			<div class="h-12 w-1 bg-[#ff7eb3]"></div>
			<div class="h-6 w-1 bg-gray-700"></div>
		</div>
	</div>

	<div
		class="flex w-full flex-1 flex-col items-center justify-center overflow-y-auto bg-[#111111] px-7 py-8 sm:px-10 sm:py-12 lg:w-1/2 lg:px-12 lg:py-24"
	>
		<div class="mb-6 w-full max-w-md lg:hidden">
			<h1
				class="mb-2 bg-linear-to-br from-[#ff3377] to-[#ff7eb3] bg-clip-text text-4xl font-extrabold tracking-tighter text-transparent italic sm:text-5xl"
			>
				Y
			</h1>
			<p class="text-xs leading-relaxed tracking-[0.18em] text-gray-500 uppercase">
				The Platform you didn't know existed.
			</p>
		</div>

		<div class="w-full max-w-md">
			<div class="mb-7 sm:mb-10">
				<h2 class="mb-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
					See What's Happening Today
				</h2>
				<p class="max-w-sm text-sm leading-relaxed text-gray-400">
					Access your
					<span
						class="bg-linear-to-br from-[#ff3377] to-[#ff7eb3] bg-clip-text font-bold text-transparent italic"
					>
						Y</span
					> profile.
				</p>
			</div>

			<form method="POST" class="space-y-5 sm:space-y-6">
				{#if form?.message}
					<p
						class="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200"
					>
						{form.message}
					</p>
				{/if}

				<div>
					<label
						for="username"
						class="mb-2 block text-[9px] font-medium tracking-[0.22em] text-gray-500 uppercase sm:text-[10px]"
					>
						Username
					</label>
					<input
						type="text"
						id="username"
						name="username"
						bind:value={username}
						placeholder="Enter your username"
						class="w-full rounded-lg border border-gray-800 bg-black px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-[#ff5c8d] focus:ring-1 focus:ring-[#ff5c8d] focus:outline-none sm:py-3.5"
						required
					/>
				</div>

				<div>
					<div class="mb-2">
						<label
							for="password"
							class="block text-[9px] font-medium tracking-[0.22em] text-gray-500 uppercase sm:text-[10px]"
						>
							Password
						</label>
					</div>
					<div class="relative">
						<input
							type={is_show_password ? 'text' : 'password'}
							id="password"
							name="password"
							bind:value={password}
							placeholder="••••••••••••"
							class="w-full rounded-lg border border-gray-800 bg-black px-4 py-3 text-sm text-white placeholder-gray-600 transition-colors focus:border-[#ff5c8d] focus:ring-1 focus:ring-[#ff5c8d] focus:outline-none sm:py-3.5"
							required
						/>
						<button
							type="button"
							onclick={toggle_password}
							aria-label={is_show_password ? 'Hide password' : 'Show password'}
							aria-pressed={is_show_password}
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
										d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
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
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
									/>
								</svg>
							{/if}
						</button>
					</div>
					<div class="mt-2 flex justify-end">
						<a
							href={resolve('/login')}
							class="text-[9px] font-medium tracking-[0.22em] text-[#ff5c8d] uppercase transition-colors hover:text-[#ff7eb3] sm:text-[10px]"
						>
							Forgot Password?
						</a>
					</div>
				</div>

				<div class="mt-4 flex items-start gap-3">
					<div class="relative flex items-center">
						<input
							type="checkbox"
							id="should_remember_me"
							bind:checked={should_remember_me}
							class="peer h-4 w-4 cursor-pointer appearance-none rounded border border-gray-700 bg-transparent transition-all checked:border-[#ff5c8d] checked:bg-[#ff5c8d]"
						/>
						<span
							class="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="h-3 w-3"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
									clip-rule="evenodd"
								/>
							</svg>
						</span>
					</div>
					<label
						for="should_remember_me"
						class="cursor-pointer text-sm leading-relaxed text-gray-400 select-none"
					>
						Stay Logged In
					</label>
				</div>

				<div class="pt-3 sm:pt-4">
					<button
						type="submit"
						class="w-full rounded-full bg-linear-to-r from-[#ff3377] to-[#ff7eb3] px-4 py-3.5 font-semibold text-white shadow-[0_0_20px_rgba(255,51,119,0.3)] transition-all hover:scale-[1.01] hover:shadow-[0_0_25px_rgba(255,51,119,0.5)] active:scale-[0.99] sm:py-4"
					>
						Sign In
					</button>
				</div>
			</form>

			<div class="mt-10 text-center text-sm text-gray-500 sm:mt-12">
				New to the Y?
				<a
					href={resolve('/register')}
					class="ml-1 text-[#ff5c8d] transition-colors hover:text-[#ff7eb3]"
				>
					Sign Up Here
				</a>
			</div>
		</div>
	</div>
</div>
