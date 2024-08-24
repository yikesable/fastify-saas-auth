import type {
  AnyDeclaration,
  AnyDeclarationType,
  ValidDeclaration,
} from '@voxpelli/type-helpers';

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
