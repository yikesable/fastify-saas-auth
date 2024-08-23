import fp from 'fastify-plugin';

/** @type {import('./fastify-roles-types.d.ts').FastifyRoleProvider} */
const resolveUserRole = request => {
  /** @type {string[]} */
  const roles = [];

  const role = request.user?.role;

  if (role) {
    roles.push(role);
  }

  return roles;
};

/**
 * @param {import('fastify').FastifyInstance} fastify
 * @returns {Promise<void>}
 */
async function fastifyUserRolesPluginFactory (fastify) {
  fastify.addHook('onReady', async function () {
    if (this.addRoleProvider) {
      this.addRoleProvider(resolveUserRole);
    } else {
      this.log.warn('Missing addRoleProvider(). Has @yikesable/fastify-roles been added?');
    }
  });
}

export default fp(fastifyUserRolesPluginFactory, {
  fastify: '>=4.0.0',
  name: '@yikesable/fastify-user-roles',
});
