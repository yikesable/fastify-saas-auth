/// <reference types="@fastify/request-context" />

import fp from 'fastify-plugin';

import fastifyAccessPlugin from './fastify-access.js';

/**
 * @callback FastifyAccessRolePermissionCallback
 * @param {string[]} roles
 * @param {string} permission
 * @returns {boolean|Promise<boolean>}
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
async function fastifyAccessRolePluginFactory (fastify, options) {
  const {
    rolePermissionCallback,
  } = options;

  if (!fastify.hasPlugin('@yikesable/fastify-role-provider')) {
    fastify.register(import('./fastify-roles.js'));
  }

  fastify.register(fastifyAccessPlugin, {
    async permissionCallback (request, permission) {
      if (!request.getRoles) {
        throw new Error('Missing roles for handler, no getRoles() present, have you added @yikesable/fastify-roles?');
      }

      const roles = await request.getRoles();

      return rolePermissionCallback([...roles], permission);
    },
  });
}

export default fp(fastifyAccessRolePluginFactory, {
  fastify: '>=4.x',
  name: 'fastify-access-role',
});
