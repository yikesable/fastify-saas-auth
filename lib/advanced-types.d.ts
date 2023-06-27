import type {
  RequestHasPermission,
} from './fastify-access.js';

// TODO: Remove this convoluted setup for sharing types once https://github.com/fastify/fastify/pull/4858 is merged
import type {
  FastifyRoleProvider,
  HasRole,
} from './fastify-roles.js';

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

declare module 'fastify' {
  interface FastifyInstance {
  // Owned by fastify-user.js
    // FIXME: Weird value for that name, should rather be something like: noUserRedirect()
    requireUser (redirectTarget?: string): void

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
    hasRole?: HasRole,

    // Belongs to fastify-access
    hasPermission?: RequestHasPermission,
  }
}
