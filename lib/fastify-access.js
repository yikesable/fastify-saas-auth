/// <reference types="@fastify/request-context" />

/* eslint-disable func-style */

import fp from 'fastify-plugin';

/** @typedef {(this: import('fastify').FastifyRequest, permission: string) => Promise<boolean>} HasPermission */

/**
 * @callback FastifyAccessPermissionCallback
 * @param {import('fastify').FastifyRequest} request
 * @param {string} permission
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
  const hasPermission = async function (permission) {
    return permissionCallback(this, permission);
  };

  fastify.decorateRequest('hasPermission', hasPermission);
}

export default fp(fastifyAccessPluginFactory, {
  fastify: '>=4.x',
  name: 'fastify-access',
});
