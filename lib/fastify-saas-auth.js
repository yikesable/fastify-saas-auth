import fp from 'fastify-plugin';
import fastifySecureSession from '@fastify/secure-session';

import { fastifyOpenIdClientPlugin } from './fastify-openid-client.js';
import fastifyRolesPlugin from './fastify-roles.js';
import fastifyUserRolesPlugin from './fastify-user-roles.js';
import fastifyUserPlugin from './fastify-user.js';
import { catchWrap } from './utils.js';

// TODO: Add an ACL / role + permission thingie. fastify-guard wasn't that good

/** @typedef {import('openid-client').UserinfoResponse} SaasAuthUserinfoResponse */

/**
 * @typedef SaasAuthIssuerData
 * @property {string} issuerName
 * @property {import('openid-client').TokenSet} tokenset
 * @property {SaasAuthUserinfoResponse} userinfo
 */

/**
 * @callback SaasAuthAuthenticationCallback
 * @param {string} authId
 * @param {SaasAuthIssuerData} data
 * @returns {Promise<string|undefined>}
 */

/**
 * @callback SaasAuthCreateUserCallback
 * @param {string} authId
 * @param {SaasAuthUserinfoResponse} issuerUserinfo
 * @returns {Promise<string>}
 */

/**
 * @typedef SaasAuthDb
 * @property {SaasAuthAuthenticationCallback} authUser
 * @property {SaasAuthCreateUserCallback} createUser
 * @property {import('./fastify-user.js').FastifyUserLoadCallback} loadUser
 */

/**
 * @typedef SaasAuthIssuer
 * @property {string} discoveryUrl
 * @property {string} clientId
 * @property {string} clientSecret
 * @property {string} [scope]
 */

/**
 * @typedef SaasAuthBasicOptions
 * @property {string} sessionSecurityKey
 * @property {string} baseUrl
 * @property {boolean} [getUserIdFromHeader]
 * @property {{ [name: string]: SaasAuthIssuer }} authIssuers
 * @property {string} [prefix]
 * @property {string} [redirectOnSignIn]
 * @property {string} [redirectOnSignOut]
 * @property {import('fastify').RouteHandlerMethod} [authPageHandler]
 */

/** @typedef {SaasAuthBasicOptions & SaasAuthDb} SaasAuthOptions */

/** @type {import('fastify').FastifyPluginAsync<SaasAuthOptions>} */
const fastifySaasAuthPluginFactory = async (fastify, options) => {
  const {
    authIssuers,
    authPageHandler,
    authUser,
    baseUrl,
    createUser,
    getUserIdFromHeader = false,
    loadUser,
    prefix = '/auth',
    redirectOnSignIn = '/',
    redirectOnSignOut = '/',
    sessionSecurityKey,
  } = options;

  if (!authIssuers) {
    throw new Error('Requires at least one item set in authIssuers');
  } else if (Object.keys(authIssuers).length === 0) {
    fastify.log.warn('No authIssuers set, can not auth');
  }

  const nameOfFirstOpenIdIssuer = Object.keys(authIssuers)[0];

  fastify.register(fastifySecureSession, {
    key: Buffer.from(sessionSecurityKey, 'hex'),
    // TODO: Set the lifetime of the cookie to be longer!
    cookie: {
      path: '/',
    },
  });

  fastify.register(fastifyRolesPlugin);
  fastify.register(fastifyUserRolesPlugin);
  fastify.register(fastifyUserPlugin, { getUserIdFromHeader, loadUser });

  /** @type {import('./fastify-openid-client.js').VerifyCallback} */
  const callback = async (tokenset, userinfo, { name, request }) => {
    if (!userinfo) throw new Error('Expected userinfo');

    // FIXME: If one is already signed in, then error

    const authId = `${name}:${userinfo.sub}`;

    /** @type {SaasAuthIssuerData} */
    const authData = {
      issuerName: name,
      tokenset,
      userinfo,
    };
    const userId = await catchWrap(authUser(authId, authData), 'Failed to auth user');

    if (userId) {
      await request.setLoggedInUser(userId, { skipLoading: true });
      return '/';
    // TODO: If the users email is already registered, we should add this as a login method for that account, not create a new user
    } else {
      // TODO: Add the option to show a signup page when this happens, instead of auto-creating the user
      const userId = await createUser(authId, userinfo);
      await request.setLoggedInUser(userId, { skipLoading: true });
      return '/';
    }
  };

  for (const name in authIssuers) {
    const openIdIssuer = authIssuers[name];

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

export const fastifySaasAuthPlugin = fp(fastifySaasAuthPluginFactory, { fastify: '>=4.x' });
