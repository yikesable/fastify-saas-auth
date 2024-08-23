export { default as fastifyAccessRequiredPlugin } from './lib/fastify-access-required.js';
export { fastifySaasAuthPlugin } from './lib/fastify-saas-auth.js';
export { addRolePermission } from './lib/rbac.js';

export type {
  FastifyAccessOptions,
  FastifyAccessPermissionCallback,
} from './lib/fastify-access-types.d.ts';

export type {
  FastifyOAuth2ClientOptions,
  SaasAuthIssuerOAuth2,
} from './lib/fastify-oauth2-client-types.d.ts';

export type {
  FastifyOpenIdClientOptions,
} from './lib/fastify-openid-client-types.d.ts';

export type {
  FastifyRoleProvider,
} from './lib/fastify-roles-types.d.ts';

export type {
  SaasAuthAuthenticationCallback,
  SaasAuthCreateUserCallback,
  SaasAuthDb,
  SaasAuthLoadUserCallback,
  SaasAuthOptions,
  SaasAuthPermissionCallback,
} from './lib/fastify-saas-auth.js';

export type {
  FastifyUserData,
} from './lib/fastify-user-types.js';

export type {
  SaasAuthIssuerUserInfo,
  SaasAuthIssuerPluginCallback,
} from './lib/issuer-plugin-types.d.ts';

export type {
  AnySaasAuthIssuer,
  AnySaasAuthIssuerType,
  SaasAuthIssuer,
  SaasAuthIssuerOAuth,
  SaasAuthIssuers,
} from './lib/issuer-types.d.ts';
