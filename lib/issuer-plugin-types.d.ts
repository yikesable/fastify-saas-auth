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
