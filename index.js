import fp from 'fastify-plugin';
import fastifySecureSession from '@fastify/secure-session';
import { fastifyAcl } from '@yikesable/fastify-acl';

import { fastifyContext, fastifyContextPlugin } from './lib/fastify-context.js';
import { fastifyOpenIdClientPlugin } from './lib/fastify-openid-client.js';
import { fastifyUserPlugin } from './lib/fastify-user.js';
import { catchWrap } from './lib/utils.js';

export { fastifyContext } from './lib/fastify-context.js';

// TODO: Add an ACL / role + permission thingie. fastify-guard wasn't that good

/** @typedef {(userId: string, data: { name: string, tokenset: import('openid-client').TokenSet, userinfo: import('openid-client').UserinfoResponse }) => Promise<string|undefined>} AuthUserCallback */
/** @typedef {(authId: string, userinfo: { name?: string|undefined, email?: string|undefined }) => Promise<string>} CreateUserCallback */

/**
 * @typedef SaasAuthIssuer
 * @property {string} discoveryUrl
 * @property {string} clientId
 * @property {string} clientSecret
 * @property {string} [scope]
 */

/**
 * @typedef SaasAuthOptions
 * @property {string} sessionSecurityKey
 * @property {string} baseUrl
 * @property {AuthUserCallback} authUser
 * @property {CreateUserCallback} createUser
 * @property {import('./lib/fastify-user.js').LoadUser} loadUser
 * @property {boolean} [getUserIdFromHeader]
 * @property {{ [name: string]: SaasAuthIssuer }} openIdIssuers
 * @property {string} [prefix]
 * @property {string} [redirectOnSignIn]
 * @property {string} [redirectOnSignOut]
 * @property {import('fastify').RouteHandlerMethod} [authPageHandler]
 */

export const fastifyAclAuthPlugin = fastifyAcl({
  actualRoles: (request) => {
    /** @type {string[]} */
    const roles = [];

    // FIXME: Have the Sass Auth Pg plugin do this instead
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

/** @type {import('fastify').FastifyPluginAsync<SaasAuthOptions>} */
const fastifySaasAuthPlugin = async (fastify, options) => {
  const {
    authPageHandler,
    authUser,
    baseUrl,
    createUser,
    getUserIdFromHeader = false,
    loadUser,
    openIdIssuers,
    prefix = '/auth',
    redirectOnSignIn = '/',
    redirectOnSignOut = '/',
    sessionSecurityKey,
  } = options;

  if (!openIdIssuers) {
    throw new Error('Requires at least one item set in openIdIssuers');
  } else if (Object.keys(openIdIssuers).length === 0) {
    fastify.log.warn('No openIdIssuers set, can not auth');
  }

  const nameOfFirstOpenIdIssuer = Object.keys(openIdIssuers)[0];

  fastify.register(fastifySecureSession, {
    key: Buffer.from(sessionSecurityKey, 'hex'),
    // TODO: Set the lifetime of the cookie to be longer!
    cookie: {
      path: '/',
    },
  });

  fastify.register(fastifyContextPlugin);
  fastify.register(fastifyUserPlugin, { fastifyContext, getUserIdFromHeader, loadUser });

  /** @type {import('./lib/fastify-openid-client.js').VerifyCallback} */
  const callback = async (tokenset, userinfo, { name, request }) => {
    if (!userinfo) throw new Error('Expected userinfo');

    // FIXME: If one is already signed in, then error

    const authId = `${name}:${userinfo.sub}`;

    const userId = await catchWrap(authUser(authId, { name, tokenset, userinfo }), 'Failed to auth user');

    if (userId) {
      await request.setLoggedInUser(userId, { skipLoading: true });
      return '/';
    // TODO: If the users email is already registered, we should add this as a login method for that account, not create a new user
    } else {
      // TODO: Add the option to show a signup page when this happens, instead of auto-creating the user
      const userId = await createUser(authId, {
        name: userinfo?.name,
        email: userinfo?.email,
      });
      await request.setLoggedInUser(userId, { skipLoading: true });
      return '/';
    }
  };

  for (const name in openIdIssuers) {
    const openIdIssuer = openIdIssuers[name];

    if (!openIdIssuer) continue;

    const { scope, ...issuerOptions } = openIdIssuer;

    fastify.register(fastifyOpenIdClientPlugin, {
      ...issuerOptions,
      name,
      loadUserInfo: true,
      baseUrl,
      prefix,
      usePKCE: true,
      params: { scope },
      callback,
    });
  }

  fastify.get(`${prefix}/logout`, (request, reply) => {
    request.removeLoggedInUser();
    reply.redirect(redirectOnSignOut);
  });

  fastify.get(`${prefix}`, {
    preHandler: async (request, reply) => {
      if (request.user) reply.redirect(redirectOnSignIn);
    },
  }, authPageHandler || (async (_request, reply) => {
    reply.redirect(`${prefix}/${nameOfFirstOpenIdIssuer}`);
  }));
};

export const fastifySaasAuth = fp(fastifySaasAuthPlugin, { fastify: '>=3.x' });
