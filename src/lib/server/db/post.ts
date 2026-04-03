import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import { user } from './auth.schema.js'
import { like, share } from './interactions.js'

export const post = pgTable('post', {
	id: text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID()),
	content: text('content').notNull(),
	imageUrl: text('image_url'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true })
		.defaultNow()
		.notNull()
		.$onUpdate(() => new Date())
})

export const post_relations = relations(post, ({ one, many }) => ({
	author: one(user, { fields: [post.userId], references: [user.id] }),
	likes: many(like),
	shares: many(share)
}))
