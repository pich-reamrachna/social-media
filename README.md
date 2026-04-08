# social-media

SvelteKit app/library scaffold with Better Auth, Drizzle ORM, Neon Postgres, Playwright, and Lefthook.

This line is committed for testing.

## Requirements

- Node.js `22.x`
- `pnpm` `10.x`
- A Neon Postgres database

## Initial Setup

1. Install dependencies:

```sh
pnpm install
```

This also runs the `prepare` script and installs Lefthook for this clone.

2. Create a local env file:

```sh
cp .env.example .env
```

3. Fill in the environment variables in `.env`:

```env
# Runtime app traffic: Neon pooled URL
DATABASE_URL="postgresql://user:password@your-host-pooler:5432/db-name?sslmode=require"

# Drizzle migrations/studio: Neon direct URL
DATABASE_URL_MIGRATION="postgresql://user:password@your-host:5432/db-name?sslmode=require"

# App origin
ORIGIN="http://localhost:5173"

# Better Auth secret
BETTER_AUTH_SECRET="replace-with-a-long-random-secret"

# Secret used to authorize the Vercel cron cleanup endpoint
CRON_SECRET="replace-with-a-long-random-secret"
```

Notes:

- Use the pooled Neon URL for `DATABASE_URL`
- Use the direct Neon URL for `DATABASE_URL_MIGRATION`
- Drizzle falls back to `DATABASE_URL` if `DATABASE_URL_MIGRATION` is not set, but the direct URL is the intended setup for migrations and Studio

## Database Setup

Generate the Better Auth schema file, then push the schema to Neon:

```sh
pnpm run auth:schema
pnpm run db:push
```

The rate limiter now stores shared counters in Neon/Postgres as well, so run `pnpm run db:push`
after pulling the latest schema changes.

Expired rate-limit rows are cleaned up globally by a Vercel cron job configured in
`vercel.json`. The cron calls `/api/cron/rate-limit-cleanup` every hour and the route
deletes rows where `reset_at <= now()`. Set `CRON_SECRET` in Vercel so the cron request
can authenticate to that endpoint.

Useful database commands:

```sh
pnpm run db:generate
pnpm run db:migrate
pnpm run db:studio
```

## Run The App

Start the dev server:

```sh
pnpm dev
```

The app will usually be available at `http://localhost:5173`.

## Quality Checks

Run the main checks locally:

```sh
pnpm run check:ci
pnpm run lint
pnpm run test
```

## Lefthook

This repo uses Lefthook for `pre-commit` and `pre-push`.

If hooks do not run, reinstall them manually:

```sh
pnpm exec lefthook install
```

If `.git/hooks` only contains sample files, Lefthook is not installed for that clone yet.

## CI Behavior

GitHub Actions CI currently runs on:

- all pull requests
- pushes to `main`

Pushing a feature branch without opening a pull request will not trigger CI.
