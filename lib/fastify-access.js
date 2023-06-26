/// <reference types="@fastify/request-context" />

/* eslint-disable func-style */

import fp from 'fastify-plugin';

/**
 * @callback FastifyAccessPermissionCallback
 * @param {import('fastify').FastifyRequest} request
 * @param {string} context
 * @param {string|undefined} [operation]
 * @returns {boolean}
 */

/**
 * @typedef FastifyAccessOptions
 * @property {FastifyAccessPermissionCallback} permissionCallback
 */

/** @typedef {(this: import('fastify').FastifyRequest, context: string, operation?: string|undefined) => boolean} RequestHasPermission */

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @param {FastifyAccessOptions} options
 * @returns {Promise<void>}
 */
async function fastifyAccessPluginFactory (fastify, options) {
  const {
    permissionCallback,
  } = options;

  /** @type {RequestHasPermission} */
  const hasPermission = function (context, operation) {
    return permissionCallback(this, context, operation);
  };

  fastify.addHook('onRequest', async (request) => {
    if (request.requestContext) {
      request.requestContext.set('hasPermission', (context, operation) => permissionCallback(request, context, operation));
    }
  });

  fastify.decorateRequest('hasPermission', hasPermission);
}

export default fp(fastifyAccessPluginFactory, {
  fastify: '>=4.x',
  name: 'fastify-access',
});
