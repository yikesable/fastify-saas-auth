import type {} from '@fastify/request-context';
import type { FastifyRequest } from 'fastify';

export type FastifyAccessPermissionCallback = (request: FastifyRequest, context: string, operation: string | undefined) => boolean;

export type FastifyAccessOptions = {
  permissionCallback: FastifyAccessPermissionCallback;
};

declare module '@fastify/request-context' {
  interface RequestContextData {
    hasPermission?: (context: string, operation?: string | undefined) => boolean,
  }
}

declare module 'fastify' {
  interface FastifyRequest {
    hasPermission?: (context: string, operation?: string | undefined) => boolean,
  }
}
