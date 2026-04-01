import { createAuthClient } from 'better-auth/client'
import { usernameClient } from 'better-auth/client/plugins'

export const auth_client = createAuthClient({
	plugins: [usernameClient()]
})
