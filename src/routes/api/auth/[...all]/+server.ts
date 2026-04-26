// src/routes/api/auth/[...all]/+server.ts
import { auth } from '$lib/server/auth'
import type { RequestHandler } from './$types'

// This file catches ANY request sent to /api/auth/* and hands it to Better Auth
export const GET: RequestHandler = ({ request }) => auth.handler(request)
export const POST: RequestHandler = ({ request }) => auth.handler(request)
