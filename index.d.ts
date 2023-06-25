export { default as fastifyAccessRequiredPlugin } from './lib/fastify-access-required.js';
export { fastifySaasAuthPlugin } from './lib/fastify-saas-auth.js';
export { addRole } from './lib/rbac.js';

export type * from './lib/advanced-types.js';

export type {
  SaasAuthAuthenticationCallback,
  SaasAuthCreateUserCallback,
  SaasAuthDb,
  SaasAuthIssuer,
  SaasAuthLoadUserCallback,
  SaasAuthOptions,
  SaasAuthPermissionCallback,
  SaasAuthUserinfoResponse,
} from './lib/fastify-saas-auth.js';
