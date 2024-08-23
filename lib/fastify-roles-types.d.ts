import type { FastifyRequest } from 'fastify';

export type FastifyRoleProvider = (request: FastifyRequest) => ReadonlyArray<string> | string;

declare module 'fastify' {
  interface FastifyInstance {
    addRoleProvider?: (provider: FastifyRoleProvider) => void
  }

  interface FastifyRequest {
    getRoles?: () => Set<string>,
    hasRole?: (wantedRole: ReadonlyArray<string> | string, all?: boolean) => boolean,
  }
}
