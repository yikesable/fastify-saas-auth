import type { ProviderConfiguration } from '@fastify/oauth2';

import type { SaasAuthIssuerPluginOptions, SaasAuthIssuerUserInfo } from './issuer-plugin-types.d.ts';
import type { SaasAuthIssuerOAuth } from './issuer-types.d.ts';

export interface SaasAuthIssuerOAuth2 extends SaasAuthIssuerOAuth<'oauth2'> {
  auth: ProviderConfiguration
  customHeaders?: { [header: string]: string },
  userProfileUrl: string,
  userProfileParse (userProfile: string): SaasAuthIssuerUserInfo,
}

export interface FastifyOAuth2ClientOptions extends SaasAuthIssuerPluginOptions, SaasAuthIssuerOAuth2 {
}

declare module './issuer-types.d.ts' {
  interface SaasAuthIssuers {
    oauth2: SaasAuthIssuerOAuth2,
  }
}
