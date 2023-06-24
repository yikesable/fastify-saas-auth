export { default as fastifyAclPlugin } from './lib/fastify-acl.js';
export { fastifySaasAuthPlugin } from './lib/fastify-saas-auth.js';

export type * from './lib/advanced-types.js';

export type {
  SaasAuthAuthenticationCallback,
  SaasAuthCreateUserCallback,
  SaasAuthDb,
  SaasAuthIssuer,
  SaasAuthOptions,
  SaasAuthUserinfoResponse,
} from './lib/fastify-saas-auth.js';

export type {
  FastifyUserLoadCallback,
} from './lib/fastify-user.js';
