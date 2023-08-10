import type {
  FastifyRoleProvider,
} from './fastify-roles.js';

import type {
  SESSION_KEY_USER_ID,
} from './fastify-user.js';

interface FastifyUserObject {
  // Owned by fastify-user.js
  id: string,
  skippedLoading?: boolean,

  // Owned by fastify-user-roles.js
  role?: string|undefined,
}

export type FastifyUserData = Omit<FastifyUserObject, 'id' | 'skippedLoading'>;

declare module '@fastify/request-context' {
  interface RequestContextData {
    // Belongs to fastify-user
    user?: Readonly<FastifyUserObject>,

    // Belongs to fastify-access
    hasPermission?: (context: string, operation?: string|undefined) => boolean,
  }
}

declare module '@fastify/secure-session' {
  interface SessionData {
    [SESSION_KEY_USER_ID]: string;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    // Owned by fastify-user.js
    requireAuthenticated (condition?: (request: FastifyRequest) => boolean|Promise<boolean>): void

    // Belongs to fastify-roles
    addRoleProvider?: (provider: FastifyRoleProvider) => void
  }

  interface FastifyRequest {
    // Belongs to fastify-user
    readonly user: Readonly<FastifyUserObject>|undefined
    setLoggedInUser (userId: string, options?: { skipLoading?: boolean }): Promise<void>
    removeLoggedInUser (): void

    // Belongs to fastify-roles
    getRoles?: () => Set<string>,
    hasRole?: (wantedRole: ReadonlyArray<string> | string, all?: boolean) => boolean,

    // Belongs to fastify-access
    hasPermission?: (context: string, operation?: string|undefined) => boolean,
  }
}
