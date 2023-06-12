import fp from 'fastify-plugin';

import { ensureArray } from './utils.js';

/** @typedef {ReadonlyArray<string> | string} Roles */

/**
 * @callback FastifyRoleProvider
 * @param {import('fastify').FastifyRequest} request
 * @returns {Roles | Promise<Roles>}
 */

/** @typedef {(resolver: FastifyRoleProvider) => void} AddRoleProvider */
/** @typedef {(this: import('fastify').FastifyRequest) => Promise<Set<string>>} GetRoles */
/** @typedef {(this: import('fastify').FastifyRequest, roles: Roles, all?: boolean) => Promise<boolean>} HasRole */

export default fp(
  async fastify => {
    /** @type {Set<FastifyRoleProvider>} */
    const roleProviders = new Set();

    if (fastify.addRoleProvider) {
      return;
    }

    fastify.decorate(
      'addRoleProvider',
      /** @type {AddRoleProvider} */
      resolver => {
        roleProviders.add(resolver);
      }
    );

    fastify.decorateRequest(
      'getRoles',
      /** @type {GetRoles} */
      async function () {
        const roles = await Promise.all(
          [...roleProviders].map(resolver => resolver(this))
        );

        return new Set(roles.flat());
      }
    );

    fastify.decorateRequest(
      'hasRole',
      /** @type {HasRole} */
      async function (wantedRole, all = false) {
        if (!this.getRoles) {
          throw new Error('Unexpectedly missing this.getRoles()');
        }

        const requestRoles = await this.getRoles();
        const wantedRoles = ensureArray(wantedRole);

        return all
          ? wantedRoles.every(item => requestRoles.has(item))
          : wantedRoles.some(item => requestRoles.has(item));
      },
      ['getRoles']
    );
  },
  {
    fastify: '>=4.0.0',
    name: '@yikesable/fastify-roles',
  }
);
