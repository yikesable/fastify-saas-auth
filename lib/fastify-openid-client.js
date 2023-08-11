import pathModule from 'node:path';
import { URL } from 'node:url';
import { format } from 'node:util';

import fp from 'fastify-plugin';
import {
  errors as openIdClientErrors,
  generators as openIdClientGenerators,
  Issuer,
} from 'openid-client';

import {
  filterUndefinedObjectValues,
  isUnknownArray,
  pick,
} from './utils.js';

const { OPError, RPError } = openIdClientErrors;
const { codeChallenge, random } = openIdClientGenerators;

/**
 * @template T
 * @typedef {T|Promise<T>} MaybePromised
 */

/** @typedef {import('openid-client').AuthorizationParameters & { scope: string, redirect_uri: string, response_type: import('openid-client').ResponseType}} BaseParams */
/** @typedef {{ code_verifier?: string, state: string } & Pick<BaseParams, 'nonce' | 'max_age' | 'response_type'>} SessionValue */
/** @typedef {(tokenset: import('openid-client').TokenSet, userinfo: import('openid-client').UserinfoResponse|undefined, context: { request: import('fastify').FastifyRequest, name: string }) => MaybePromised<boolean|string|URL|void>} VerifyCallback Returns either a success bool or a string to redirect to */

/**
 * @typedef IssuerOptions
 * @property {string} discoveryUrl
 * @property {string} clientId
 * @property {string} clientSecret
 * @property {string} [name]
 * @property {boolean} [loadUserInfo]
 * @property {string} [sessionKey]
 * @property {'plain'|'S256'|true} [usePKCE]
 * @property {Omit<import('openid-client').AuthorizationParameters, 'redirect_uri' | 'response_type'>} [params]
 * @property {import('openid-client').CallbackExtras} [extras]
 */

/**
 * @typedef OpenIdClientIssuerPluginOptions
 * @property {string} baseUrl
 * @property {VerifyCallback} callback
 * @property {string} [prefix]
 * @property {string} [successRedirect]
 * @property {string} [failureRedirect]
 */

/** @type {import('fastify').FastifyPluginAsync<IssuerOptions & OpenIdClientIssuerPluginOptions>} */
const fastifyOpenIdClientPluginFactory = async (fastify, options) => {
  const {
    baseUrl: rawBaseUrl,
    callback,
    failureRedirect,
    prefix = '',
    successRedirect,
    ...issuerOptions
  } = options;

  const {
    clientId,
    clientSecret,
    discoveryUrl,
    extras: rawExtras,
    loadUserInfo,
    params: rawParams,
    sessionKey: rawSessionKey,
    usePKCE: rawPKCE,
  } = issuerOptions;

  // FIXME: Check how long this is cached
  const issuerInstance = await Issuer.discover(discoveryUrl);

  // *** Configure everything ***

  const baseUrl = new URL(rawBaseUrl);
  const prefixedBaseUrl = new URL(prefix + '/', baseUrl);

  const name = issuerOptions.name || (new URL(discoveryUrl)).hostname;
  const sessionKey = rawSessionKey || `fastify:oidc:${name}`;
  const baseExtras = structuredClone(rawExtras || {});

  const authUrl = new URL(name + '/', prefixedBaseUrl);
  const redirectUri = new URL('callback', authUrl);

  /** @type {BaseParams} */
  const baseParams = {
    scope: 'openid',
    ...structuredClone(rawParams || {}),
    redirect_uri: redirectUri.toString(),
    response_type: 'code',
  };

  /** @type {'plain'|'S256'|undefined} */
  let pkce;

  if (rawPKCE === true) {
    const supportedMethods = isUnknownArray(issuerInstance['code_challenge_methods_supported'])
      ? issuerInstance['code_challenge_methods_supported']
      : false;

    if (!supportedMethods || supportedMethods.includes('S256')) {
      pkce = 'S256';
    } else if (supportedMethods.includes('plain')) {
      pkce = 'plain';
    } else {
      throw new TypeError('neither code_challenge_method supported by the client is supported by the issuer');
    }
  } else if (typeof rawPKCE === 'string') {
    if (!['plain', 'S256'].includes(rawPKCE)) {
      throw new TypeError(`${rawPKCE} is not valid/implemented PKCE code_challenge_method`);
    }
    pkce = rawPKCE;
  }

  // *** Set up OpenID Client ***

  const client = new issuerInstance.Client({
    client_id: clientId,
    client_secret: clientSecret,
    // TODO: Complete this one
    redirect_uris: [baseParams.redirect_uri],
    response_types: [baseParams.response_type],
    // id_token_signed_response_alg (default "RS256")
    // token_endpoint_auth_method (default "client_secret_basic")
  });

  // *** Set up routes ***

  fastify.get('/' + pathModule.relative(baseUrl.pathname, authUrl.pathname), (request, response) => {
    // provide options object with extra authentication parameters
    const params = { state: random(), ...baseParams };

    if (!params.nonce && params.response_type.includes('id_token')) {
      params.nonce = random();
    }

    /** @type {SessionValue} */
    const sessionValue = pick(params, ['nonce', 'state', 'max_age', 'response_type']);

    if (pkce && params.response_type.includes('code')) {
      const verifier = random();

      sessionValue.code_verifier = verifier;

      switch (pkce) {
        case 'S256':
          params.code_challenge = codeChallenge(verifier);
          params.code_challenge_method = 'S256';
          break;
        case 'plain':
          params.code_challenge = verifier;
          break;
      }
    }

    request.session.set(sessionKey, sessionValue);

    const target = client.authorizationUrl(params);

    response.redirect(target);
  });

  fastify.get('/' + pathModule.relative(baseUrl.pathname, redirectUri.pathname), async (request, response) => {
    const reqParams = client.callbackParams(request.raw);

    /** @type {SessionValue} */
    const session = request.session.get(sessionKey);

    if (Object.keys(session || {}).length === 0) {
      // TODO: Handle better!
      throw new Error(format('did not find expected authorization request details in session, req.session["%s"] is %j', sessionKey, session));
    }

    const {
      code_verifier: codeVerifier, max_age: maxAge, nonce, response_type: responseType, state,
    } = session;

    // Remove the temporary session value
    request.session.set(sessionKey, undefined);

    const checks = filterUndefinedObjectValues({
      nonce,
      state,
      code_verifier: codeVerifier,
      max_age: maxAge,
      response_type: responseType,
    });

    /** @type {import('openid-client').TokenSet|undefined} */
    let tokenset;
    /** @type {import('openid-client').UserinfoResponse|undefined} */
    let userinfo;
    /** @type {boolean|string|URL|void|undefined} */
    let success;

    try {
      tokenset = await client.callback(baseParams.redirect_uri, reqParams, checks, baseExtras);

      if (loadUserInfo && client.issuer['userinfo_endpoint']) {
        if (!tokenset.access_token) {
          // TODO: Use your own error types
          // @ts-ignore
          throw new RPError({
            message: 'expected access_token to be returned when asking for userinfo in verify callback',
            tokenset,
          });
        }
        userinfo = await client.userinfo(tokenset);
      }

      success = await callback(tokenset, userinfo, { name, request });
    } catch (err) {
      // Mimicking https://github.com/panva/node-openid-client/blob/7e045ca1d7026359d32ba3be5becc1965b959e01/lib/passport_strategy.js#L192-L197
      if (
        (
          err instanceof OPError &&
          err.error !== 'server_error' &&
          err.error?.startsWith('invalid') === false
        ) ||
        err instanceof RPError
      ) {
        request.log.warn({ err }, 'OpenID Connect authorization failed');
        success = false;
      } else {
        throw new Error('Unexpect error occurred in OpenID Connect callback', { cause: err });
      }
    }

    const redirectPath = success instanceof URL
      ? success
      : (new URL(
          typeof success === 'string'
            ? success
            : (
                success === false
                  ? failureRedirect || `${prefix}?error=true`
                  : successRedirect || prefix
              ),
          baseUrl
        ));

    response.redirect(redirectPath.toString());
  });
};

export const fastifyOpenIdClientPlugin = fp(fastifyOpenIdClientPluginFactory, {
  fastify: '>=4.x',
  name: '@yikesable/fastify-openid-client',
});
