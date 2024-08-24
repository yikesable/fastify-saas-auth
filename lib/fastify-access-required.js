import fp from 'fastify-plugin';

import { HttpError } from './utils.js';

/**
 * @typedef FastifyAccessRequiredPluginOptions
 * @property {number} [httpErrorCode]
 * @property {string|[string, string]} permission
 */

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {FastifyAccessRequiredPluginOptions} options
 * @returns {Promise<void>}
 */
const fastifyAccessRequiredPluginFactory = async (fastify, options) => {
  const {
    httpErrorCode = 403,
    permission,
  } = options;

  fastify.addHook('preValidation', async (request, reply) => {
    if (!request.hasPermission) {
      throw new Error('Missing permission lookup, no hasPermission() present, have you added @yikesable/fastify-access?');
    }

    const hasPermission = await (
      Array.isArray(permission)
        ? request.hasPermission(...permission)
        : request.hasPermission(permission)
    );

    if (!hasPermission) {
      return reply.send(new HttpError(httpErrorCode));
    }
  });
};

export default fp(fastifyAccessRequiredPluginFactory, {
  fastify: '>=4.x',
  name: 'fastify-access-required',
});
