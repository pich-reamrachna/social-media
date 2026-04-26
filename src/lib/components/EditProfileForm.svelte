<script lang="ts">
	import { enhance } from '$app/forms'
	import { goto } from '$app/navigation'
	import { MAX_BIO_LENGTH, validate_username } from '$lib/constants/auth'

	type ProfileFormProfile = {
		name: string
		username: string
		bio: string
		banner_url: string
		avatar_url: string
	}

	type ProfileFormValues = Partial<Pick<ProfileFormProfile, 'name' | 'username' | 'bio'>>

	const {
		profile,
		action = undefined,
		form_message = '',
		form_values = {},
		eyebrow = '',
		title = 'Edit Profile',
		can_close = false,
		on_close,
		on_profile_update_start
	} = $props<{
		profile: ProfileFormProfile
		action?: string
		form_message?: string
		form_values?: ProfileFormValues
		eyebrow?: string
		title?: string
		can_close?: boolean
		on_close?: () => void
		on_profile_update_start?: (changes: { avatar: boolean; banner: boolean; text: boolean }) => void
	}>()

	let name = $state('')
	let username = $state('')
	let bio = $state('')
	let avatar_preview = $state('')
	let banner_preview = $state('')
	let form_error = $state('')
	let is_saving_profile = $state(false)
	let username_status = $state<'idle' | 'checking' | 'error' | 'valid'>('idle')
	let username_message = $state('')
	let debounce_timer: ReturnType<typeof setTimeout> | undefined

	$effect(() => {
		name = form_values.name ?? profile.name
		username = form_values.username ?? profile.username
		bio = form_values.bio ?? profile.bio
		form_error = form_message
	})

	const has_errors = $derived(username_status === 'error' || username_status === 'checking')
	const remaining_bio_chars = $derived(MAX_BIO_LENGTH - bio.length)

	const reset_previews = () => {
		if (avatar_preview) URL.revokeObjectURL(avatar_preview)
		if (banner_preview) URL.revokeObjectURL(banner_preview)
		avatar_preview = ''
		banner_preview = ''
	}

	function handle_file_preview(event: Event, type: 'avatar' | 'banner') {
		const input = event.target as HTMLInputElement
		const file = input.files?.[0]
		if (!file) return

		const url = URL.createObjectURL(file)
		if (type === 'avatar') {
			if (avatar_preview) URL.revokeObjectURL(avatar_preview)
			avatar_preview = url
		}
		if (type === 'banner') {
			if (banner_preview) URL.revokeObjectURL(banner_preview)
			banner_preview = url
		}
	}

	const check_username = (value: string) => {
		const trimmed = value.trim().toLowerCase()
		clearTimeout(debounce_timer)

		if (!trimmed) {
			username_status = 'idle'
			username_message = ''
			return
		}

		const validation = validate_username(trimmed)
		if (!validation.ok) {
			username_status = 'error'
			username_message = validation.message
			return
		}

		if (trimmed === profile.username.trim().toLowerCase()) {
			username_status = 'idle'
			username_message = ''
			return
		}

		username_status = 'checking'
		username_message = 'Checking availability...'

		debounce_timer = setTimeout(async () => {
			try {
				const res = await fetch(`/api/check-username?username=${encodeURIComponent(trimmed)}`)
				const { available } = await res.json()
				if (available) {
					username_status = 'valid'
					username_message = 'Username is available'
				} else {
					username_status = 'error'
					username_message = 'Username already taken'
				}
			} catch {
				username_status = 'idle'
				username_message = ''
			}
		}, 400)
	}
</script>

<form
	method="POST"
	{action}
	enctype="multipart/form-data"
	use:enhance={() => {
		is_saving_profile = true
		form_error = ''
		return async ({ result, update }) => {
			is_saving_profile = false
			if (result.type === 'redirect') {
				await update()
				return
			}
			if (result.type === 'success') {
				const payload = result.data as { profile_url?: string } | undefined
				const changes = {
					avatar: !!avatar_preview,
					banner: !!banner_preview,
					text:
						name.trim() !== profile.name.trim() ||
						bio.trim() !== profile.bio.trim() ||
						username.trim().toLowerCase() !== profile.username.trim().toLowerCase()
				}
				reset_previews()
				on_profile_update_start?.(changes)
				on_close?.()
				if (payload?.profile_url) {
					// eslint-disable-next-line svelte/no-navigation-without-resolve
					await goto(payload.profile_url, { invalidateAll: true })
					return
				}
			} else if (result.type === 'failure') {
				form_error =
					result.data &&
					typeof result.data === 'object' &&
					'message' in result.data &&
					typeof result.data.message === 'string'
						? result.data.message
						: 'Failed to save profile'
			}
			await update()
		}
	}}
>
	<div class="flex items-center justify-between border-b border-[#333] px-3 py-3 sm:px-4">
		<div class="flex items-center gap-6">
			<div>
				{#if eyebrow}
					<p class="text-[0.68rem] font-bold tracking-[0.24em] text-[#ff5c8d] uppercase">
						{eyebrow}
					</p>
				{/if}
				<h2 class="text-base font-bold text-[#f3f4f6] sm:text-lg">{title}</h2>
			</div>
		</div>
		<div class="flex items-center gap-2">
			{#if can_close}
				<button
					type="button"
					disabled={is_saving_profile}
					class="cursor-pointer rounded-full border border-[#444] px-3 py-1.5 text-sm font-bold text-[#9ca3af] transition-colors hover:border-[#666] hover:text-[#f3f4f6] disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
					onclick={() => {
						reset_previews()
						form_error = ''
						on_close?.()
					}}
				>
					CANCEL
				</button>
			{/if}
			<button
				type="submit"
				disabled={is_saving_profile || has_errors}
				class="cursor-pointer rounded-full bg-linear-to-r from-[#ff3377] to-[#ff5588] px-3 py-1.5 text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:px-5"
			>
				{is_saving_profile ? 'SAVING...' : 'SAVE'}
			</button>
		</div>
	</div>

	{#if form_error}
		<div class="bg-red-500/10 px-4 py-2 text-center text-sm font-medium text-red-400">
			{form_error}
		</div>
	{/if}

	<div class="max-h-[80vh] overflow-y-auto pb-8">
		<div class="group relative h-36 w-full bg-[#222] sm:h-48">
			<img
				src={banner_preview || profile.banner_url}
				alt="Banner"
				class="h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-50"
			/>

			<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
				<div class="rounded-full bg-black/60 p-2 text-white backdrop-blur-md sm:p-3">
					<svg class="h-5 w-5 sm:h-6 sm:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
				</div>
			</div>
			<input
				type="file"
				name="banner"
				accept=".jpg,.jpeg,.png,.gif,.webp"
				class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
				onchange={(e) => handle_file_preview(e, 'banner')}
			/>
		</div>

		<div class="relative px-4 sm:px-6">
			<div
				class="group relative -mt-10 inline-block h-20 w-20 rounded-full border-4 border-[#161616] bg-[#222] sm:-mt-16 sm:h-32 sm:w-32"
			>
				<img
					src={avatar_preview || profile.avatar_url}
					alt="Avatar"
					class="h-full w-full rounded-full object-cover opacity-70 transition-opacity group-hover:opacity-50"
				/>

				<div class="pointer-events-none absolute inset-0 flex items-center justify-center">
					<div class="rounded-full bg-black/60 p-2 text-white backdrop-blur-md">
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
							/>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
							/>
						</svg>
					</div>
				</div>
				<input
					type="file"
					name="avatar"
					accept=".jpg,.jpeg,.png,.gif,.webp"
					class="absolute inset-0 h-full w-full cursor-pointer rounded-full opacity-0"
					onchange={(e) => handle_file_preview(e, 'avatar')}
				/>
			</div>
		</div>

		<div class="mt-4 space-y-5 px-4 sm:px-6">
			<div class="flex flex-col">
				<label
					for="name"
					class="mb-1 text-[0.7rem] font-bold tracking-wider text-[#6b7280] uppercase"
				>
					Displayed Name
				</label>
				<input
					id="name"
					name="name"
					type="text"
					bind:value={name}
					class="rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-3 text-[0.95rem] text-[#f3f4f6] focus:border-[#ff3377] focus:ring-1 focus:ring-[#ff3377] focus:outline-none"
					required
				/>
			</div>

			<div class="flex flex-col">
				<label
					for="username"
					class="mb-1 text-[0.7rem] font-bold tracking-wider text-[#6b7280] uppercase"
				>
					Username
				</label>
				<input
					id="username"
					name="username"
					type="text"
					bind:value={username}
					oninput={(e) => check_username((e.currentTarget as HTMLInputElement).value)}
					placeholder="choose_your_handle"
					class="rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-3 text-[0.95rem] text-[#f3f4f6] placeholder:text-[#555] focus:border-[#ff3377] focus:ring-1 focus:ring-[#ff3377] focus:outline-none"
					required
				/>
				{#if username_message}
					<p
						class:text-green-400={username_status === 'valid'}
						class:text-red-400={username_status === 'error'}
						class:text-gray-400={username_status === 'checking'}
						class="mt-2 text-sm wrap-break-word"
					>
						{username_message}
					</p>
				{/if}
			</div>

			<div class="flex flex-col">
				<label
					for="bio"
					class="mb-1 text-[0.7rem] font-bold tracking-wider text-[#6b7280] uppercase"
				>
					Bio
				</label>
				<div class="relative">
					<textarea
						id="bio"
						name="bio"
						rows="3"
						maxlength={MAX_BIO_LENGTH}
						bind:value={bio}
						class="w-full resize-none rounded-lg border border-[#333] bg-[#0a0a0a] px-3 py-3 text-[0.95rem] text-[#f3f4f6] focus:border-[#ff3377] focus:ring-1 focus:ring-[#ff3377] focus:outline-none"
					></textarea>
					<div
						class="mt-2 text-right text-xs font-medium text-[#6b7280]"
						class:text-[#ff7eb3]={remaining_bio_chars <= 20}
					>
						{remaining_bio_chars}
					</div>
				</div>
			</div>
		</div>
	</div>
</form>
