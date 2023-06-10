import fp from 'fastify-plugin';

/** @type {import('./fastify-roles.js').FastifyRoleProvider} */
const resolveUserRole = request => {
  /** @type {string[]} */
  const roles = [];

  const role = request.user?.role;
  // FIXME: Have the organization plugin do this instead
  // const userRoleInOrganization = request.getUserRoleInOrganization && request.getUserRoleInOrganization();

  if (role) {
    roles.push('site:' + role);
  }
  // if (userRoleInOrganization) {
  //   roles.push('org:' + userRoleInOrganization);
  // }

  request.log.info({ roles }, 'User roles');

  return roles;
};

/** @type {import('fastify').FastifyPluginAsync} */
const fastifyUserAclPluginFactory = async (fastify) => {
  fastify.addHook('onReady', async function () {
    if (this.addRoleProvider) {
      this.addRoleProvider(resolveUserRole);
    } else {
      this.log.warn('Missing addRoleProvider(). Has @yikesable/fastify-roles been added?');
    }
  });
};

export default fp(fastifyUserAclPluginFactory, {
  fastify: '>=4.0.0',
  name: '@yikesable/fastify-user-roles',
});
