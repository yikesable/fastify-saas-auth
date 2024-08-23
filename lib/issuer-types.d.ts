import type {
  AnyDeclaration,
  AnyDeclarationType,
  ValidDeclaration,
} from '@voxpelli/type-helpers';

import { MaybePromised } from '@voxpelli/type-helpers';
import type { UserinfoResponse } from 'openid-client';

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

export interface SaasAuthIssuer<TypeName extends AnySaasAuthIssuerType> extends ValidDeclaration<TypeName, SaasAuthIssuers> {
  // Intentionally left empty
}

export interface SaasAuthIssuerOAuth<T extends AnySaasAuthIssuerType> extends SaasAuthIssuer<T> {
  clientId: string,
  clientSecret: string,
  scope?: string[],
}

export interface SaasAuthIssuers {
  unknown: SaasAuthIssuer<'unknown'>,
}

export type AnySaasAuthIssuer = AnyDeclaration<SaasAuthIssuers>;
export type AnySaasAuthIssuerType = AnyDeclarationType<SaasAuthIssuers>;
