import fp from 'fastify-plugin';

/** @typedef {ReadonlyArray<string> | string} Roles */

/**
 * @callback FastifyRoleProvider
 * @param {import('fastify').FastifyRequest} request
 * @returns {Roles | Promise<Roles>}
 */

/** @typedef {(resolver: FastifyRoleProvider) => void} AddRoleProvider */
/** @typedef {(this: import('fastify').FastifyRequest) => Promise<Set<string>>} GetActiveRoles */

export default fp(
  async fastify => {
    /** @type {Set<FastifyRoleProvider>} */
    const roleProviders = new Set();

    fastify.decorate('addRoleProvider',
      /** @type {AddRoleProvider} */
      resolver => {
        roleProviders.add(resolver);
      }
    );
    fastify.decorateRequest('getActiveRoles',
      /** @type {GetActiveRoles} */
      async function () {
        const roles = await Promise.all(
          [...roleProviders].map(resolver => resolver(this))
        );

        return new Set(roles.flat());
      }
    );
  },
  {
    fastify: '>=4.0.0',
    name: '@yikesable/fastify-roles',
  }
);
