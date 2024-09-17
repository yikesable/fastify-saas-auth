import fp from 'fastify-plugin';

/**
 * @callback FastifyAccessPermissionCallback
 * @param {import('fastify').FastifyRequest} request
 * @param {string} context
 * @param {string|undefined} operation
 * @returns {boolean}
 */

/**
 * @typedef FastifyAccessOptions
 * @property {FastifyAccessPermissionCallback} permissionCallback
 */

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {FastifyAccessOptions} options
 * @returns {Promise<void>}
 */
async function fastifyAccessPluginFactory (fastify, options) {
  const {
    permissionCallback,
  } = options;

  fastify.addHook('onRequest', async (request) => {
    if (!request.requestContext) return;

    request.requestContext.set('hasPermission', function (context, operation) {
      return permissionCallback(request, context, operation);
    });
  });

  fastify.decorateRequest('hasPermission', function (context, operation) {
    return permissionCallback(this, context, operation);
  });
}

export default fp(fastifyAccessPluginFactory, {
  fastify: '>=5.x',
  name: 'fastify-access',
});
