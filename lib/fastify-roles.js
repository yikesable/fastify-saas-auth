import fp from 'fastify-plugin';

import { ensureArray } from './utils.js';

// TODO: Should support role hiearchy?

/**
 * @callback FastifyRoleProvider
 * @param {import('fastify').FastifyRequest} request
 * @returns {ReadonlyArray<string> | string}
 */

export default fp(
  async fastify => {
    /** @type {Set<FastifyRoleProvider>} */
    const roleProviders = new Set();

    if (fastify.addRoleProvider) {
      return;
    }

    fastify.decorate('addRoleProvider', resolver => {
      roleProviders.add(resolver);
    });

    fastify.decorateRequest('getRoles', function () {
      /** @type {string[]} */
      const roles = [...roleProviders].flatMap(resolver => resolver(this));

      this.log.debug({ roles }, 'Resolved roles');

      return new Set(roles);
    });

    fastify.decorateRequest(
      'hasRole',
      function (wantedRole, all = false) {
        if (!this.getRoles) {
          throw new Error('Unexpectedly missing this.getRoles()');
        }

        const activeRoles = this.getRoles();
        const wantedRoles = ensureArray(wantedRole);

        return all
          ? wantedRoles.every(item => activeRoles.has(item))
          : wantedRoles.some(item => activeRoles.has(item));
      },
      ['getRoles']
    );
  },
  {
    fastify: '>=4.0.0',
    name: '@yikesable/fastify-roles',
  }
);
