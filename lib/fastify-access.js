/// <reference types="@fastify/request-context" />

/* eslint-disable func-style */

import fp from 'fastify-plugin';

/** @typedef {import('./advanced-types.d.ts').HasPermission} HasPermission */

/**
 * @callback FastifyAccessPermissionCallback
 * @param {import('fastify').FastifyRequest} request
 * @param {string} context
 * @param {string|undefined} [operation]
 * @returns {boolean|Promise<boolean>}
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

  /** @type {HasPermission} */
  const hasPermission = async function (context, operation) {
    return permissionCallback(this, context, operation);
  };

  fastify.addHook('onRequest', async (request) => {
    if (request.requestContext) {
      request.requestContext.set('hasPermission', async (context, operation) => permissionCallback(request, context, operation));
    }
  });

  fastify.decorateRequest('hasPermission', hasPermission);
}

export default fp(fastifyAccessPluginFactory, {
  fastify: '>=4.x',
  name: 'fastify-access',
});
