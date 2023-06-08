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
  pick,
} from './utils.js';

const { RPError } = openIdClientErrors;
const { codeChallenge, random } = openIdClientGenerators;

/**
 * @template T
 * @typedef {T|Promise<T>} MaybePromised
 */

/** @typedef {import('openid-client').AuthorizationParameters & { scope: string, redirect_uri: string, response_type: import('openid-client').ResponseType}} BaseParams */
/** @typedef {{ code_verifier?: string, state: string } & Pick<BaseParams, 'nonce' | 'max_age' | 'response_type'>} SessionValue */
/** @typedef {(tokenset: import('openid-client').TokenSet, userinfo: import('openid-client').UserinfoResponse|undefined, context: { request: import('fastify').FastifyRequest, name: string }) => MaybePromised<boolean|string|void>} VerifyCallback Returns either a success bool or a string to redirect to */

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
    const supportedMethods = Array.isArray(issuerInstance['code_challenge_methods_supported'])
      ? issuerInstance['code_challenge_methods_supported']
      : false;

    if (supportedMethods && supportedMethods.includes('S256')) {
      pkce = 'S256';
    } else if (supportedMethods && supportedMethods.includes('plain')) {
      pkce = 'plain';
    } else if (supportedMethods) {
      throw new TypeError('neither code_challenge_method supported by the client is supported by the issuer');
    } else {
      pkce = 'S256';
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
    // const codeVerifier = generators.codeVerifier();

    // request.session.set(sessionKey, codeVerifier);
    // // store the code_verifier in your framework's session mechanism, if it is a cookie based solution
    // // it should be httpOnly (not readable by javascript) and encrypted.

    // const code_challenge = generators.codeChallenge(codeVerifier);

    // client.authorizationUrl({
    //   scope: 'openid email profile',
    //   resource: 'https://my.api.example.com/resource/32178',
    //   code_challenge,
    //   code_challenge_method: 'S256',
    // });
  });

  fastify.get('/' + pathModule.relative(baseUrl.pathname, redirectUri.pathname), async (request, response) => {
    const reqParams = client.callbackParams(request.raw);

    /** @type {SessionValue} */
    const session = request.session.get(sessionKey);

    if (Object.keys(session || {}).length === 0) {
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

    const tokenset = await client.callback(baseParams.redirect_uri, reqParams, checks, baseExtras);
    /** @type {import('openid-client').UserinfoResponse|undefined} */
    let userinfo;

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

    const success = await callback(tokenset, userinfo, { name, request });

    if (typeof success === 'string') {
      response.redirect(success);
    } else if (success === false) {
      if (failureRedirect) {
        response.redirect(failureRedirect);
      } else {
        throw new Error('We had a failure but nowhere to redirect them?');
      }
    } else {
      if (successRedirect) {
        response.redirect(successRedirect);
      } else {
        throw new Error('We had a success but nowhere to redirect them?');
      }
    }
  });
};

// TODO: Add this error handling above somewhere
// })().catch((error) => {
//   if (
//     (error instanceof OPError && error.error !== 'server_error' && !error.error.startsWith('invalid'))
//     || error instanceof RPError
//   ) {
//     this.fail(error);
//   } else {
//     this.error(error);
//   }
// });

export const fastifyOpenIdClientPlugin = fp(fastifyOpenIdClientPluginFactory, {
  fastify: '>=4.x',
  name: 'fastify-openid-client',
});
