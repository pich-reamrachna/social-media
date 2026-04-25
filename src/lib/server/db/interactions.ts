import { pgTable, text, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { user } from './auth.schema.js'
import { post } from './post.js'

/**
 * Like Table
 * A simple join table connecting users and posts.
 * A user can only like a post once (composite primary key).
 */
export const like = pgTable(
	'like',
	{
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		postId: text('post_id')
			.notNull()
			.references(() => post.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [primaryKey({ columns: [t.userId, t.postId] })]
)

/**
 * Share Table
 * Tracks which posts have been shared by which users.
 */
export const share = pgTable('share', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	postId: text('post_id')
		.notNull()
		.references(() => post.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
})

// --- Relations ---

export const like_relations = relations(like, ({ one }) => ({
	post: one(post, { fields: [like.postId], references: [post.id] }),
	user: one(user, { fields: [like.userId], references: [user.id] })
}))

export const share_relations = relations(share, ({ one }) => ({
	post: one(post, { fields: [share.postId], references: [post.id] }),
	user: one(user, { fields: [share.userId], references: [user.id] })
}))

/**
 * Follow Table
 * Tracks follower/following relationships between users.
 */
export const follow = pgTable(
	'follow',
	{
		followerId: text('follower_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		followingId: text('following_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
	},
	(t) => [primaryKey({ columns: [t.followerId, t.followingId] })]
)

export const follow_relations = relations(follow, ({ one }) => ({
	follower: one(user, {
		fields: [follow.followerId],
		references: [user.id],
		relationName: 'follower'
	}),
	following: one(user, {
		fields: [follow.followingId],
		references: [user.id],
		relationName: 'following'
	})
}))
