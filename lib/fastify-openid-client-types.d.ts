import type { SessionData } from '@fastify/secure-session';

import type {
  AuthorizationParameters,
  CallbackExtras,
  ResponseType,
} from 'openid-client';

import type { SESSION_KEY_PREFIX_OPENID } from './fastify-openid-client.d.ts';
import type { SaasAuthIssuerPluginOptions } from './issuer-plugin-types.d.ts';
import type { SaasAuthIssuerOAuth } from './issuer-types.d.ts';
import type { KeysOfValue } from './util-types.d.ts';

// Internal types

export type BaseParams = AuthorizationParameters & {
  scope: string;
  redirect_uri: string;
  response_type: ResponseType;
};

export type SessionValue = {
  code_verifier?: string;
  state: string;
} & Pick<BaseParams, 'nonce' | 'max_age' | 'response_type'>;

type OpenIdSessionData = Record<`${typeof SESSION_KEY_PREFIX_OPENID}${string}`, SessionValue>;

// External types

export interface SaasAuthIssuerOpenIdConnect extends SaasAuthIssuerOAuth<'oidc'> {
  discoveryUrl: string,
}

export interface FastifyOpenIdClientOptions extends SaasAuthIssuerPluginOptions, SaasAuthIssuerOpenIdConnect {
  loadUserInfo?: boolean,
  sessionKey?: KeysOfValue<SessionData, SessionValue>,
  usePKCE?: 'plain' | 'S256' | true,
  params?: Omit<AuthorizationParameters, 'redirect_uri' | 'response_type'>,
  extras?: CallbackExtras,
}

declare module './issuer-types.d.ts' {
  interface SaasAuthIssuers {
    oidc: SaasAuthIssuerOpenIdConnect,
  }
}

declare module '@fastify/secure-session' {
  interface SessionData extends Record<`${typeof SESSION_KEY_PREFIX_OPENID}${string}`, SessionValue> {}
}
