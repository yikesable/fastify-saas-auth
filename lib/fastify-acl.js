import fp from 'fastify-plugin';

import { HttpError } from './utils.js';

/**
 * @typedef FastifyAclPluginOptions
 * @property {boolean} [all]
 * @property {import('./fastify-roles.js').Roles} allowedRoles
 * @property {number} [httpErrorCode]
 * @property {import('./fastify-roles.js').FastifyRoleProvider} [roleProvider]
 */

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {FastifyAclPluginOptions} options
 * @returns {Promise<void>}
 */
const fastifyAclPluginFactory = async (fastify, options) => {
  const {
    all = false,
    allowedRoles,
    httpErrorCode = 403,
    roleProvider,
  } = options;

  if (!fastify.hasPlugin('@yikesable/fastify-role-provider')) {
    fastify.register(import('./fastify-roles.js'));
  }

  if (roleProvider) {
    fastify.addHook('onReady', async function () {
      if (this.addRoleProvider) {
        this.addRoleProvider(roleProvider);
      }
    });
  }

  fastify.addHook('preHandler', async (request, reply) => {
    if (!request.hasRole) {
      throw new Error('Missing roles for handler, no hasRole() present, have you added @yikesable/fastify-roles?');
    }

    const isAuthorized = await request.hasRole(allowedRoles, all);

    if (!isAuthorized) {
      return reply.send(new HttpError(httpErrorCode));
    }
  });
};

export default fp(fastifyAclPluginFactory, { fastify: '>=4.0.0' });
