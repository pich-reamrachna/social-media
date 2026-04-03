import { db } from '$lib/server/db'
import { user } from '$lib/server/db/auth.schema'
import { post } from '$lib/server/db/post'
import { like } from '$lib/server/db/interactions' // Needed for the liked posts query
import { error } from '@sveltejs/kit'
import { desc, eq } from 'drizzle-orm'
import type { PageServerLoad } from './$types'

export const load: PageServerLoad = async ({ params, locals }) => {
	const viewer = locals.user
	const targetUsername = params.username

	const profileUser = await db.query.user.findFirst({
		where: eq(user.username, targetUsername)
	})

	if (!profileUser) {
		throw error(404, { message: 'Profile not found' })
	}

	const isOwner = viewer ? viewer.id === profileUser.id : false

	// Fetch post that the user made
	const profilePosts = await db.query.post.findMany({
		where: eq(post.userId, profileUser.id),
		with: {
			author: true,
			likes: true,
			shares: true
		},
		orderBy: [desc(post.createdAt)]
	})

	// Fetch liked posts by the user
	const userLikes = await db.query.like.findMany({
		where: eq(like.userId, profileUser.id),
		with: {
			post: {
				with: {
					author: true,
					likes: true,
					shares: true
				}
			}
		},
		orderBy: [desc(like.createdAt)]
	})

	// Get posts from the like relation
	const likedPosts = userLikes.map((l) => l.post)

	const trending = [
		{ category: 'TECHNOLOGY · TRENDING', tag: '#NeuralInterface', count: '45.2K' },
		{ category: 'ART · TRENDING', tag: '#DigitalNoir', count: '12.9K' },
		{ category: 'MUSIC · TRENDING', tag: 'Synthetix Core', count: '8.1K' }
	]

	const who_to_follow = [
		{
			name: 'Billie Eilish',
			handle: 'billieeilish',
			avatar_url: 'https://i.pravatar.cc/150?img=5'
		},
		{
			name: 'Bad Bunny',
			handle: 'badbunnypr',
			avatar_url: 'https://i.pravatar.cc/150?img=60'
		}
	]

	// Render post
	const mapPostForFrontend = (p: any) => ({
		id: p.id,
		author: {
			name: p.author.name,
			handle: p.author.username ?? p.author.email?.split('@')[0] ?? 'user',
			avatar_url: p.author.image || `https://i.pravatar.cc/150?u=${p.author.id}`
		},
		content: p.content,
		images: p.imageUrl ? [p.imageUrl] : [],
		timestamp: p.createdAt,
		is_liked_by_user: viewer ? p.likes.some((l: any) => l.userId === viewer.id) : false,
		stats: {
			comments: 0,
			echo_count: p.shares?.length ?? 0,
			likes: p.likes?.length ?? 0
		}
	})

	return {
		current_user: viewer
			? {
					name: viewer.name,
					handle: viewer.username || viewer.email?.split('@')[0] || 'user',
					avatar_url: viewer.image || `https://i.pravatar.cc/150?u=${viewer.id}`
				}
			: null,
		isOwner,
		profile: {
			id: profileUser.id,
			name: profileUser.name,
			handle: profileUser.username ?? profileUser.email.split('@')[0],
			bio: profileUser.bio || 'This user has no bio yet.',
			banner_url:
				profileUser.banner ||
				'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop',
			avatar_url: profileUser.image || `https://i.pravatar.cc/150?u=${profileUser.id}`,
			joined_date: profileUser.createdAt
		},
		// 4. Return BOTH arrays to the frontend!
		posts: profilePosts.map(mapPostForFrontend),
		liked_posts: likedPosts.map(mapPostForFrontend),
		trending,
		who_to_follow
	}
}
