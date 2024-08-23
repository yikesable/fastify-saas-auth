import type {} from '@fastify/request-context';
import type {} from '@fastify/secure-session';
import type {} from 'fastify';

import type { SESSION_KEY_USER_ID } from './fastify-user.js';

interface FastifyUserObject {
  // Owned by fastify-user.js
  id: string,
  skippedLoading?: boolean,

  // Owned by fastify-user-roles.js
  role?: string | undefined,
}

export type FastifyUserData = Omit<FastifyUserObject, 'id' | 'skippedLoading'>;

declare module '@fastify/request-context' {
  interface RequestContextData {
    user?: Readonly<FastifyUserObject>,
  }
}

declare module '@fastify/secure-session' {
  interface SessionData {
    [SESSION_KEY_USER_ID]: string;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    requireAuthenticated (): void
  }

  interface FastifyRequest {
    readonly user: Readonly<FastifyUserObject> | undefined
    setLoggedInUser (userId: string, options?: { skipLoading?: boolean }): Promise<void>
    removeLoggedInUser (): void
  }
}
