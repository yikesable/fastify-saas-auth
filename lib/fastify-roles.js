import fp from 'fastify-plugin';

import { ensureArray } from './utils.js';

// TODO: Should support role hiearchy?

/** @typedef {ReadonlyArray<string> | string} Roles */

/**
 * @callback FastifyRoleProvider
 * @param {import('fastify').FastifyRequest} request
 * @returns {Roles}
 */

/** @typedef {typeof hasRole} HasRole */

/**
 * @this {import('fastify').FastifyRequest}
 * @param {Roles} wantedRole
 * @param {boolean} [all]
 * @returns {boolean}
 */
function hasRole (wantedRole, all = false) {
  if (!this.getRoles) {
    throw new Error('Unexpectedly missing this.getRoles()');
  }

  const activeRoles = this.getRoles();
  const wantedRoles = ensureArray(wantedRole);

  return all
    ? wantedRoles.every(item => activeRoles.has(item))
    : wantedRoles.some(item => activeRoles.has(item));
}

export default fp(
  async fastify => {
    /** @type {Set<FastifyRoleProvider>} */
    const roleProviders = new Set();

    if (fastify.addRoleProvider) {
      return;
    }

    fastify.decorate('addRoleProvider', addRoleProvider);
    fastify.decorateRequest('getRoles', getRoles);
    fastify.decorateRequest('hasRole', hasRole, ['getRoles']);

    /**
     * @param {FastifyRoleProvider} resolver
     * @returns {void}
     */
    function addRoleProvider (resolver) {
      roleProviders.add(resolver);
    }

    /**
     * @this {import('fastify').FastifyRequest}
     * @returns {Set<string>}
     */
    function getRoles () {
      const roles = [...roleProviders].map(resolver => resolver(this));

      return new Set(roles.flat());
    }
  },
  {
    fastify: '>=4.0.0',
    name: '@yikesable/fastify-roles',
  }
);
