import type { MaybePromised } from '@voxpelli/type-helpers';
import type { FastifyRequest } from 'fastify';
import type { UserinfoResponse } from 'openid-client';

export interface SaasAuthIssuerUserInfo extends UserinfoResponse {
}

export type SaasAuthIssuerPluginCallback = (
  userinfo: SaasAuthIssuerUserInfo | undefined,
  context: {
    request: FastifyRequest;
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
