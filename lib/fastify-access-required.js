/// <reference types="@fastify/request-context" />

import fp from 'fastify-plugin';

import { HttpError } from './utils.js';

/**
 * @typedef FastifyAccessRequiredPluginOptions
 * @property {number} [httpErrorCode]
 * @property {string} permission
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

  if (!fastify.hasPlugin('@yikesable/fastify-access')) {
    throw new Error('Expected @yikesable/fastify-access to be registered');
  }

  fastify.addHook('preHandler', async (request, reply) => {
    if (!request.hasPermission) {
      throw new Error('Missing permission lookup, no hasPermission() present, have you added @yikesable/fastify-access?');
    }

    const hasPermission = await request.hasPermission(permission);

    if (!hasPermission) {
      return reply.send(new HttpError(httpErrorCode));
    }
  });
};

export default fp(fastifyAccessRequiredPluginFactory, {
  fastify: '>=4.x',
  name: 'fastify-access-required',
});
