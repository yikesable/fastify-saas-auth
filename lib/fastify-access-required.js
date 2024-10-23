import fp from 'fastify-plugin';

import { HttpError } from './utils.js';

/**
 * @template {import('./rbac-types.d.ts').PermissionContexts} Context
 * @template {import('./rbac-types.d.ts').PermissionContextOperations[Context]} Operation
 * @param {import('fastify').FastifyInstance} fastify
 * @param {object} options
 * @param {number} [options.httpErrorCode]
 * @param {Context|[Context, Operation | '*']} options.permission
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
  fastify: '>=5.x',
  name: 'fastify-access-required',
});
