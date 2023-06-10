import fp from 'fastify-plugin';

import { HttpError, ensureArray } from './utils.js';

/**
 * @param {Set<string>} roles
 * @param {import('./fastify-roles.js').Roles} allowedRoles
 * @param {boolean} [all]
 * @returns {boolean}
 */
function isAuthorized (roles, allowedRoles, all = false) {
  const allowed = ensureArray(allowedRoles);

  return all
    ? allowed.every(item => roles.has(item))
    : allowed.some(item => roles.has(item));
}

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
    if (!request.getActiveRoles) {
      throw new Error('Missing roles for handler, no getActiveRoles() present, have you added @yikesable/fastify-roles?');
    }

    const activeRoles = await request.getActiveRoles();

    if (!isAuthorized(activeRoles, allowedRoles, all)) {
      return reply.send(new HttpError(httpErrorCode));
    }
  });
};

export default fp(fastifyAclPluginFactory, { fastify: '>=4.0.0' });
