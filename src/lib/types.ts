export type ProfilePost = {
	id: string
	author: {
		id: string
		name: string
		handle: string
		avatar_url: string
	}
	content: string
	images: string[]
	timestamp: Date
	is_liked_by_user: boolean
	stats: {
		likes: number
	}
}

export type ProfileData = {
	id: string
	name: string
	handle: string
	bio: string
	banner_url: string
	avatar_url: string
	joined_date: Date
	stats: {
		followers: number
		following: number
	}
}

// Unified user type for Sidebars, Lists, and Search
export type FollowUser = {
	id: string
	name: string
	handle: string
	avatar_url: string
	is_following?: boolean
	stats?: {
		followers: number
		following: number
	}
}

export type SideNavUser = FollowUser
