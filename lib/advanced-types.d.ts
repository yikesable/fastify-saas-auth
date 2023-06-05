import type { FastifyBaseLogger } from 'fastify';

interface FastifyUserObject {
  readonly id: string,
  readonly skippedLoading?: boolean,
}

interface FastifyContextInterface {
  log: FastifyBaseLogger,
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
