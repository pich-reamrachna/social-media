import { bigint, index, integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core'

export const rate_limit = pgTable(
	'rate_limit',
	{
		key: text('key').notNull(),
		windowId: bigint('window_id', { mode: 'number' }).notNull(),
		count: integer('count').notNull().default(0),
		resetAt: timestamp('reset_at', { withTimezone: true }).notNull()
	},
	(table) => [
		primaryKey({ columns: [table.key, table.windowId] }),
		index('rate_limit_reset_at_idx').on(table.resetAt)
	]
)
