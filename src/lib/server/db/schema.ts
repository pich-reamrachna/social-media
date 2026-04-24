import { relations } from 'drizzle-orm'
import * as auth from './auth.schema.js'
import * as postSchema from './post.js'
import * as interactions from './interactions.js'

/**
 * Unified User Relations
 * This is the MAGIC that allows you to fetch a user and all their posts at once.
 * It also enables the feed by letting you fetch posts with their author info.
 */
export const user_relations = relations(auth.user, ({ many }) => ({
	sessions: many(auth.session),
	accounts: many(auth.account),
	posts: many(postSchema.post),
	likes: many(interactions.like),
	shares: many(interactions.share),
	followers: many(interactions.follow, { relationName: 'following' }),
	following: many(interactions.follow, { relationName: 'follower' })
}))

// Re-export EVERYTHING so 'db.query' can see all tables
export * from './auth.schema.js'
export * from './post.js'
export * from './interactions.js'
export * from './rate-limit.js'
