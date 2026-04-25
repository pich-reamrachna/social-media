<script lang="ts">
	import EditProfileForm from '$lib/components/EditProfileForm.svelte'
	import type { ActionData, PageData } from './$types'

	const { form, data } = $props<{ form: ActionData; data: PageData }>()
</script>

<div
	class="flex min-h-dvh items-center justify-center bg-[#0d0d0d] px-4 py-8 font-sans text-gray-100 selection:bg-pink-500 selection:text-white"
>
	<div class="w-full max-w-150 overflow-hidden rounded-2xl bg-[#161616] shadow-2xl">
		<EditProfileForm
			eyebrow="Finish Profile"
			profile={{
				name: data.current_user.name,
				username: '',
				bio: '',
				banner_url: data.current_user.banner_url,
				avatar_url: data.current_user.avatar_url
			}}
			form_message={form?.message}
			form_values={{
				name: form?.name,
				username: form?.username,
				bio: form?.bio
			}}
		/>
	</div>
</div>
