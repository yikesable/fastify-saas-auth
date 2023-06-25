import type {
  AddRoleProvider,
  GetRoles,
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

export type HasPermission = (this: import('fastify').FastifyRequest, context: string, operation?: string|undefined) => Promise<boolean>;

declare module '@fastify/request-context' {
  interface RequestContextData {
    // Belongs to fastify-user
    user?: Readonly<FastifyUserObject>,

    // Belongs to fastify-access
    hasPermission?: HasPermission,
  }
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
    readonly user: Readonly<FastifyUserObject>|undefined
    setLoggedInUser (userId: string, options?: { skipLoading?: boolean }): Promise<void>
    removeLoggedInUser (): void

    // Belongs to fastify-roles
    getRoles?: GetRoles,
    hasRole?: HasRole,

    // Belongs to fastify-access
    hasPermission?: HasPermission,
  }
}
