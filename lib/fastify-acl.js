import { fastifyAcl } from '@yikesable/fastify-acl';

export const fastifyAclPlugin = fastifyAcl({
  actualRoles: (request) => {
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
  },
  httpErrorCode: 404,
});
