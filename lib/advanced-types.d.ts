import type { FastifyBaseLogger } from 'fastify';

interface FastifyUserObject {
  // Owned by fastify-user.js
  readonly id: string,
  readonly skippedLoading?: boolean,
  // Owned by fastify-sass-auth.js
  readonly role?: string|undefined,
}

interface FastifyContextInterface {
  // Owned by fastify-context.js
  log: FastifyBaseLogger,
  // Owned by fastify-user.js
  user?: FastifyUserObject,
}

declare module 'fastify' {
  interface FastifyInstance {
    requireUser (redirectTarget?: string): void
  }

  interface FastifyRequest {
    readonly user: FastifyUserObject|undefined
    setLoggedInUser (userId: string, options?: { skipLoading?: boolean }): Promise<void>
    removeLoggedInUser (): void
  }
}
