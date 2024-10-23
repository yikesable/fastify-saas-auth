import type {} from '@fastify/request-context';
import type { FastifyRequest } from 'fastify';
import type { PermissionContexts, PermissionContextOperations } from './rbac-types.d.ts';

export type FastifyAccessPermissionCallback = <
  Context extends PermissionContexts,
  Operation extends PermissionContextOperations[Context]
>(
  request: FastifyRequest,
  context: Context,
  operation?: Operation | '*' | undefined
) => boolean;

export type FastifyAccessOptions = {
  permissionCallback: FastifyAccessPermissionCallback;
};

type HasPermission = <
  Context extends PermissionContexts,
  Operation extends PermissionContextOperations[Context]
>(
  context: Context,
  operation?: Operation | '*'
) => boolean;

declare module '@fastify/request-context' {
  interface RequestContextData {
    hasPermission?: HasPermission,
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    hasPermission?: HasPermission,
  }
}
