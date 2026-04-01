---
name: better-auth
description: Comprehensive guide for Better Auth. Use this when setting up authentication, adding login providers (Google, GitHub, etc.), protecting routes in SvelteKit/Next.js, or modifying the auth schema with Drizzle. Essential for handling user sessions, profile images, and credential logins.
---

# Better Auth Mastery

Better Auth is a modern, framework-agnostic authentication library that is type-safe and easy to use. In this project, it is primarily integrated with **SvelteKit** and **Drizzle ORM**.

## Core Concepts

### 1. Server-Side Configuration (`src/lib/server/auth.ts`)

The `auth` object is the heart of the system. It handles the database connection and global authentication logic.

- **Drizzle Adapter:** Connects Better Auth to your Postgres tables.
- **Plugins:** Use `username()` for custom handles and `sveltekitCookies()` for SvelteKit integration.

### 2. Route Protection (`src/hooks.server.ts`)

To protect pages from unauthenticated users, you should use SvelteKit's `handle` hook:

- Check `event.locals.getSession()` (if using the SvelteKit plugin).
- Redirect to `/login` if no session is found for protected routes.

## Common Tasks

### Adding a New Social Provider

To add a provider like GitHub:

1.  **Environment Variables:** Add `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` to `.env`.
2.  **Auth Config:** Update `src/lib/server/auth.ts`:
    ```typescript
    export const auth = betterAuth({
    	socialProviders: {
    		github: {
    			clientId: env.GITHUB_CLIENT_ID,
    			clientSecret: env.GITHUB_CLIENT_SECRET
    		}
    	}
    })
    ```

### Using the Auth Client (Frontend)

Use `authClient` from `src/lib/auth-client.ts` to perform actions in your components:

```typescript
import { authClient } from '$lib/auth-client'

const handleSignIn = async () => {
	await authClient.signIn.social({
		provider: 'github'
	})
}
```

### Extending the User Schema

If you need to add a field like `bio` or `reputation`:

1.  Add the column to `src/lib/server/db/auth.schema.ts`.
2.  Update the `user` table in your Drizzle schema.
3.  Add the field to the `user` object in `betterAuth({ ... })` if needed for session visibility.

## Schema Reference

Better Auth requires specific tables to function. These are typically:

- `user`: Core user profile data.
- `session`: Active login sessions.
- `account`: Connections between users and providers (e.g., Google, email).
- `verification`: Email verification and password reset tokens.

## Pro-Tips

- **Avatar URLs:** Better Auth automatically maps social profile pictures to the `image` field in your `user` table.
- **Username Plugin:** Always put `sveltekitCookies()` as the **last** plugin in the `plugins` array in `auth.ts`.
- **Database Migrations:** After changing the auth schema, run `pnpm drizzle-kit generate` and `pnpm drizzle-kit push` (or `migrate`).

## Troubleshooting

- **Session Not Found:** Ensure `baseURL` is correctly set in your environment variables.
- **Cookie Issues:** Check that `sveltekitCookies` is correctly initialized in `auth.ts`.
