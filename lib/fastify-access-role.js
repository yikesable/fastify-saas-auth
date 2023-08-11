/// <reference types="@fastify/request-context" />

import fp from 'fastify-plugin';

import fastifyAccessPlugin from './fastify-access.js';

/**
 * @callback FastifyAccessRolePermissionCallback
 * @param {string[]} roles
 * @param {string} context
 * @param {string|undefined} operation
 * @returns {boolean}
 */

/**
 * @typedef FastifyAccessRoleOptions
 * @property {FastifyAccessRolePermissionCallback} rolePermissionCallback
 */

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {FastifyAccessRoleOptions} options
 * @returns {Promise<void>}
 */
async function fastifyAccessRolePluginFactory (fastify, { rolePermissionCallback }) {
  /** @type {import('./fastify-access.js').FastifyAccessPermissionCallback} */
  const permissionCallback = (request, context, operation) => {
    if (!request.getRoles) {
      throw new Error('Missing roles for handler, no getRoles() present, have you added @yikesable/fastify-roles?');
    }

    const roles = [...request.getRoles()];
    const hasPermission = rolePermissionCallback(roles, context, operation);

    request.log.debug({
      hasPermission,
      permissionContext: context,
      permissionOperation: operation,
      roles,
    }, 'Checking permission');

    return hasPermission;
  };

  if (fastify.hasPlugin('@yikesable/fastify-role-provider')) {
    fastify.register(fastifyAccessPlugin, { permissionCallback });
  } else {
    fastify
      .register(import('./fastify-roles.js'))
      .register(fastifyAccessPlugin, { permissionCallback });
  }
}

export default fp(fastifyAccessRolePluginFactory, {
  fastify: '>=4.x',
  name: 'fastify-access-role',
});
