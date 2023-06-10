import type { FastifyBaseLogger } from 'fastify';

import type { AddRoleProvider, GetActiveRoles } from './fastify-roles.js';

interface FastifyUserObject {
  // Owned by fastify-user.js
  readonly id: string,
  readonly skippedLoading?: boolean,
  // Owned by fastify-user-roles.js
  readonly role?: string|undefined,
}

interface FastifyContextInterface {
  // Belongs to fastify-context
  log: FastifyBaseLogger,
  // Belongs to fastify-user
  user?: FastifyUserObject,
}

declare module 'fastify' {
  interface FastifyInstance {
  // Owned by fastify-user.js
    // FIXME: Weird value for that name, should rather be something like: noUserRedirect()
    requireUser (redirectTarget?: string): void

    // Belongs to fastify-roles
    addRoleProvider?: AddRoleProvider
  }

  interface FastifyRequest {
    // Belongs to fastify-user
    readonly user: FastifyUserObject|undefined
    setLoggedInUser (userId: string, options?: { skipLoading?: boolean }): Promise<void>
    removeLoggedInUser (): void

    // Belongs to fastify-roles
    getActiveRoles?: GetActiveRoles,
  }
}
