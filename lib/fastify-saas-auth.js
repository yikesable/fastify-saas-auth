import fp from 'fastify-plugin';

import fastifyAccessRolePlugin from './fastify-access-role.js';
import { fastifyOauth2ClientPlugin } from './fastify-oauth2-client.js';
import { fastifyOpenIdClientPlugin } from './fastify-openid-client.js';
import fastifyRolesPlugin from './fastify-roles.js';
import fastifyUserRolesPlugin from './fastify-user-roles.js';
import fastifyUserPlugin from './fastify-user.js';
import { catchWrap } from './utils.js';

/** @import { AnySaasAuthIssuer, SaasAuthIssuerUserInfo } from './issuer-types.js' */

/** @typedef {import('./fastify-access-role.js').FastifyAccessRolePermissionCallback} SaasAuthPermissionCallback */
/** @typedef {import('./fastify-user.js').FastifyUserLoadCallback} SaasAuthLoadUserCallback */

/**
 * @callback SaasAuthAuthenticationCallback
 * @param {string} authId
 * @returns {Promise<string|undefined>}
 */

/**
 * @callback SaasAuthCreateUserCallback
 * @param {string} authId
 * @param {SaasAuthIssuerUserInfo} issuerUserinfo
 * @returns {Promise<string>}
 */

/**
 * @typedef SaasAuthDb
 * @property {SaasAuthAuthenticationCallback} authUser
 * @property {SaasAuthCreateUserCallback} createUser
 * @property {SaasAuthLoadUserCallback} loadUser
 */

/**
 * @typedef SaasAuthBasicOptions
 * @property {{ [name: string]: AnySaasAuthIssuer }} authIssuers
 * @property {import('fastify').RouteHandlerMethod} [authPageHandler]
 * @property {string} baseUrl
 * @property {boolean} [getUserIdFromHeader]
 * @property {SaasAuthPermissionCallback} [permissionCallback]
 * @property {string} [prefix]
 * @property {string} [redirectOnSignIn]
 * @property {string} [redirectOnSignOut]
 * @property {number} [sessionMaxAgeDays]
 * @property {string} sessionSecurityKey
 */

/** @typedef {SaasAuthBasicOptions & SaasAuthDb} SaasAuthOptions */

/** @type {import('fastify').FastifyPluginAsync<SaasAuthOptions>} */
const fastifySaasAuthPluginFactory = async (fastify, options) => {
  const {
    authIssuers,
    authPageHandler,
    baseUrl,
    getUserIdFromHeader = false,
    permissionCallback = () => false,
    prefix = '/auth',
    redirectOnSignIn = '/',
    redirectOnSignOut = '/',
    sessionMaxAgeDays = 30,
    sessionSecurityKey,
  } = options;

  const {
    authUser,
    createUser,
    loadUser,
  } = options;

  if (!authIssuers) {
    throw new Error('Requires at least one item set in authIssuers');
  } else if (Object.keys(authIssuers).length === 0) {
    fastify.log.warn('No authIssuers set, can not auth');
  }

  const nameOfFirstOpenIdIssuer = Object.keys(authIssuers)[0];

  fastify.register(fastifyRolesPlugin);
  fastify.register(fastifyAccessRolePlugin, {
    rolePermissionCallback: permissionCallback,
  });
  fastify.register(fastifyUserRolesPlugin);
  fastify.register(fastifyUserPlugin, {
    authPath: prefix,
    getUserIdFromHeader,
    loadUser,
    sessionOptions: {
      key: Buffer.from(sessionSecurityKey, 'hex'),
      cookie: {
        path: '/',
        maxAge: 60 * 60 * 24 * sessionMaxAgeDays,
      },
    },
  });

  // TODO: Make use with fastify-oauth2
  // FIXME: Extract this and the loop after into a separate file and adapt for other auth types like GitHub and IndieAuth
  /** @type {import('./issuer-plugin-types.js').SaasAuthIssuerPluginCallback} */
  const callback = async (userinfo, { name, request }) => {
    if (!userinfo) throw new Error('Expected userinfo');

    // TODO: If one is already signed in, then error

    const authId = `${name}:${userinfo.sub}`;

    const userId = await catchWrap(authUser(authId), 'Failed to auth user');

    if (userId) {
      await request.setLoggedInUser(userId, { skipLoading: true });
      return '/';
    // FIXME: If the users email is already registered, we should add this as a login method for that account, not create a new user
    } else {
      // TODO: Add the option to show a signup page when this happens, instead of auto-creating the user
      const userId = await createUser(authId, userinfo);
      await request.setLoggedInUser(userId, { skipLoading: true });
      return '/';
    }
  };

  for (const [name, issuer] of Object.entries(authIssuers)) {
    switch (issuer.type) {
      case 'oidc':
        fastify.register(fastifyOpenIdClientPlugin, {
          ...issuer,
          name,
          loadUserInfo: true,
          baseUrl,
          prefix,
          usePKCE: true,
          callback,
        });

        break;
      case 'oauth2':
        fastify.register(fastifyOauth2ClientPlugin, {
          ...issuer,
          baseUrl,
          callback,
          name,
          prefix,
        });
        break;
      default:
        throw new Error(`Unsupported auth type: ${issuer.type}`);
    }
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

export const fastifySaasAuthPlugin = fp(fastifySaasAuthPluginFactory, { fastify: '>=4.x' });
