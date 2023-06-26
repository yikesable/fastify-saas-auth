/// <reference types="@fastify/request-context" />

import fp from 'fastify-plugin';

import fastifyAccessPlugin from './fastify-access.js';

/**
 * @callback FastifyAccessRolePermissionCallback
 * @param {string[]} roles
 * @param {string} permission
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
async function fastifyAccessRolePluginFactory (fastify, options) {
  const {
    rolePermissionCallback,
  } = options;

  if (!fastify.hasPlugin('@yikesable/fastify-role-provider')) {
    fastify.register(import('./fastify-roles.js'));
  }

  fastify.register(fastifyAccessPlugin, {
    permissionCallback (request, permission) {
      if (!request.getRoles) {
        throw new Error('Missing roles for handler, no getRoles() present, have you added @yikesable/fastify-roles?');
      }
      return rolePermissionCallback([...request.getRoles()], permission);
    },
  });
}

export default fp(fastifyAccessRolePluginFactory, {
  fastify: '>=4.x',
  name: 'fastify-access-role',
});
