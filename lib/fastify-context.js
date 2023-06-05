import { AsyncLocalStorage } from 'node:async_hooks';

import fp from 'fastify-plugin';

const asyncLocalStorage = new AsyncLocalStorage();

/** @typedef {import('./advanced-types.d.ts').FastifyContextInterface} FastifyContext */

/**
 * @typedef FastifyContextOptions
 * @property {FastifyContext} [contextDefaults]
 */

/**
 * Inspired by "fastify-http-context" module
 *
 * @type {import('fastify').FastifyPluginAsync<FastifyContextOptions>}
 */
const fastifyContextPluginFactory = async (fastify, { contextDefaults } = {}) => {
  fastify.addHook('onRequest', (request, _reply, done) => {
    const storedContext = {
      log: request.log.child({ fromFastifyContext: true }),
      ...contextDefaults,
    };

    asyncLocalStorage.run(storedContext, () => {
      done();
    });
  });
}

export const fastifyContextPlugin = fp(fastifyContextPluginFactory, { fastify: '>=3.x' });

export const fastifyContext = {
  /**
   * @template {keyof FastifyContext} T
   * @param {T} key
   * @param {FastifyContext[T]} value
   * @returns {void}
   */
  set: (key, value) => {
    /** @type {FastifyContext} */
    const storedContext = asyncLocalStorage.getStore();

    if (storedContext) {
      storedContext[key] = value;
    }
  },

  /**
   * @template {keyof FastifyContext} T
   * @param {T} key
   * @returns {FastifyContext[T]|undefined}
   */
  get: (key) => {
    /** @type {FastifyContext} */
    const storedContext = asyncLocalStorage.getStore();

    return storedContext ? storedContext[key] : undefined;
  },

  /**
   * @template {keyof FastifyContext} T
   * @param {T} key
   * @returns {void}
   */
  'delete': (key) => {
    /** @type {FastifyContext} */
    const storedContext = asyncLocalStorage.getStore();

    if (storedContext) {
      delete storedContext[key];
    }
  },
};
