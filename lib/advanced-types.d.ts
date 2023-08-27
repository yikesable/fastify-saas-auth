import type { ProviderConfiguration } from '@fastify/oauth2';
import type { UserinfoResponse } from 'openid-client';

import type {
  AnyDeclaration,
  AnyDeclarationType,
  MaybePromised,
  ValidDeclaration,
} from '@voxpelli/type-helpers';

import type { FastifyRoleProvider } from './fastify-roles.js';
import type { SESSION_KEY_USER_ID } from './fastify-user.js';

// *** User ***

interface FastifyUserObject {
  // Owned by fastify-user.js
  id: string,
  skippedLoading?: boolean,

  // Owned by fastify-user-roles.js
  role?: string|undefined,
}

export type FastifyUserData = Omit<FastifyUserObject, 'id' | 'skippedLoading'>;

// *** OpenID Client ***

export interface FastifyOpenIdClientOptions extends SaasAuthIssuerPluginOptions, SaasAuthIssuerOpenIdConnect {
  loadUserInfo?: boolean,
  sessionKey?: string,
  usePKCE?: 'plain'|'S256'|true,
  params?: Omit<import('openid-client').AuthorizationParameters, 'redirect_uri' | 'response_type'>,
  extras?: import('openid-client').CallbackExtras,
}

// *** OAuth 2 Client ***

export interface FastifyOAuth2ClientOptions extends SaasAuthIssuerPluginOptions, SaasAuthIssuerOAuth2 {
}

// ***  SaasAuthIssuerPlugin ***

export interface SaasAuthIssuerUserInfo extends UserinfoResponse {
}

export type SaasAuthIssuerPluginCallback = (
  userinfo: SaasAuthIssuerUserInfo | undefined,
  context: {
    request: import('fastify').FastifyRequest;
    name: string;
  }
) => MaybePromised<boolean | string | URL | void>;


interface SaasAuthIssuerPluginOptions {
  baseUrl: string
  callback: SaasAuthIssuerPluginCallback
  name: string,
  prefix?: string
  successRedirect?: string
  failureRedirect?: string
}

// *** SaasAuthIssuer ***

export interface SaasAuthIssuerOAuth<T extends AnySaasAuthIssuerType> extends SaasAuthIssuer<T> {
  clientId: string,
  clientSecret: string,
  scope?: string[],
}

export interface SaasAuthIssuerOAuth2 extends SaasAuthIssuerOAuth<'oauth2'> {
  auth: ProviderConfiguration
  customHeaders?: { [header: string]: string },
  userProfileUrl: string,
  userProfileParse (userProfile: string): SaasAuthIssuerUserInfo,
}

export interface SaasAuthIssuerOpenIdConnect extends SaasAuthIssuerOAuth<'oidc'> {
  discoveryUrl: string,
}

export interface SaasAuthIssuer<TypeName extends AnySaasAuthIssuerType> extends ValidDeclaration<TypeName, SaasAuthIssuers> {
  // Intentionally left empty
}

export interface SaasAuthIssuers {
  oauth2: SaasAuthIssuerOAuth2,
  oidc: SaasAuthIssuerOpenIdConnect,
  unknown: SaasAuthIssuer<'unknown'>,
}

export type AnySaasAuthIssuer = AnyDeclaration<SaasAuthIssuers>
export type AnySaasAuthIssuerType = AnyDeclarationType<SaasAuthIssuers>;

// *** Extension of existing interfaces

declare module '@fastify/request-context' {
  interface RequestContextData {
    // Belongs to fastify-user
    user?: Readonly<FastifyUserObject>,

    // Belongs to fastify-access
    hasPermission?: (context: string, operation?: string|undefined) => boolean,
  }
}

declare module '@fastify/secure-session' {
  interface SessionData {
    [SESSION_KEY_USER_ID]: string;
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    // Owned by fastify-user.js
    requireAuthenticated (): void

    // Belongs to fastify-roles
    addRoleProvider?: (provider: FastifyRoleProvider) => void
  }

  interface FastifyRequest {
    // Belongs to fastify-user
    readonly user: Readonly<FastifyUserObject>|undefined
    setLoggedInUser (userId: string, options?: { skipLoading?: boolean }): Promise<void>
    removeLoggedInUser (): void

    // Belongs to fastify-roles
    getRoles?: () => Set<string>,
    hasRole?: (wantedRole: ReadonlyArray<string> | string, all?: boolean) => boolean,

    // Belongs to fastify-access
    hasPermission?: (context: string, operation?: string|undefined) => boolean,
  }
}
