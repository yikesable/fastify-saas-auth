/// <reference types="@fastify/request-context" />

// TODO: Rename it to something different than https://github.com/platformatic/fastify-user

/* eslint-disable func-style */

import fp from 'fastify-plugin';
import { ensureSingleValue } from './utils.js';

export const SESSION_KEY_USER_ID = 'fastify:user:user-id';

/** @typedef {import('./advanced-types.d.ts').FastifyUserObject} FastifyUserObject */
/** @typedef {import('./advanced-types.d.ts').FastifyUserData} FastifyUserData */
/** @typedef {(userId: string) => Promise<FastifyUserData|undefined>} FastifyUserLoadCallback */

/**
 * @typedef FastifyUserOptions
 * @property {boolean} [getUserIdFromHeader]
 * @property {FastifyUserLoadCallback} [loadUser]
 */

/** @type {(this: import('fastify').FastifyInstance, redirectTarget?: string) => void} */
const requireUser = function requireUser (redirectTarget = '/') {
  this.addHook('preValidation', async (request, reply) => {
    if (!request.user) {
      reply.redirect(redirectTarget);
    }
  });
};

/** @type {import('fastify').FastifyPluginAsync<FastifyUserOptions>} */
const fastifyUserPluginFactory = async (fastify, options) => {
  const {
    getUserIdFromHeader,
    loadUser,
  } = options;

  // eslint-disable-next-line n/no-process-env
  if (getUserIdFromHeader && process.env['NODE_ENV'] !== 'test') {
    fastify.log.warn('You should only use getUserIdFromHeader in tests');
  }

  /** @type {WeakMap<import('fastify').FastifyRequest, Readonly<FastifyUserObject>|undefined>} */
  const weakRequestUserCache = new WeakMap();

  /**
   * @param {import('fastify').FastifyRequest} request
   * @param {string|undefined} userId
   * @param {{ skipLoading?: boolean|undefined }} options
   * @returns {Promise<void>}
   */
  const loadLoggedInUser = async function (request, userId, { skipLoading } = {}) {
    /** @type {Readonly<FastifyUserObject>|undefined} */
    let userDefinition;

    if (userId) {
      const loadedUser = (loadUser && !skipLoading)
        ? await loadUser(userId)
        : { skippedLoading: !!skipLoading };

      if (loadedUser) {
        userDefinition = Object.freeze({
          ...loadedUser,
          id: userId,
        });
      } else {
        request.removeLoggedInUser();
      }
    }

    request.log.info(userDefinition ? 'Loaded a user' : 'Did not load a user');

    weakRequestUserCache.set(request, userDefinition);

    if (request.requestContext) {
      request.requestContext.set('user', userDefinition);
    }
  };

  /** @type {(this: import('fastify').FastifyRequest, userId: string, options?: { skipLoading?: boolean }) => Promise<void>} */
  const setLoggedInUser = async function (userId, { skipLoading } = {}) {
    if (!userId) throw new TypeError('Expected "userId" to be a non-empty string, instead got a falsy value');

    this.session.set(SESSION_KEY_USER_ID, userId);

    await loadLoggedInUser(this, userId, { skipLoading });

    // TODO: Improve error
    // FIXME: REACTIVATE!?
    // if (this.organization && this.getUserRoleInOrganization() === undefined) throw new Error('User have no access to current organization');
  };

  /** @type {(this: import('fastify').FastifyRequest) => void} */
  const removeLoggedInUser = function () {
    this.session.set(SESSION_KEY_USER_ID, undefined);

    // Reset the request user cache so that the user will load on next access
    weakRequestUserCache.delete(this);
    if (this.requestContext) {
      this.requestContext.set('user', undefined);
    }
  };

  fastify.addHook('onRequest', async (request) => {
    const userId = getUserIdFromHeader
      ? ensureSingleValue(request.headers['x-test-user-id']) // Usable in tests
      : request.session.get(SESSION_KEY_USER_ID); // Usable in real life
    return loadLoggedInUser(request, userId);
  });

  fastify.decorate('requireUser', requireUser);

  fastify.decorateRequest('user', {
    /** @type {(this: import('fastify').FastifyRequest) => Readonly<FastifyUserObject> | undefined} */
    getter () {
      return weakRequestUserCache.get(this);
    },
  });

  fastify.decorateRequest('setLoggedInUser', setLoggedInUser);
  fastify.decorateRequest('removeLoggedInUser', removeLoggedInUser);
};

export default fp(fastifyUserPluginFactory, {
  fastify: '>=4.x',
  name: 'fastify-user',
});
