export { default as fastifyAccessRequiredPlugin } from './lib/fastify-access-required.js';
export { fastifySaasAuthPlugin } from './lib/fastify-saas-auth.js';
export { addRolePermission } from './lib/rbac.js';

export type * from './lib/advanced-types.d.ts';

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

export type {
  FastifyRoleProvider,
} from './lib/fastify-roles.js';
