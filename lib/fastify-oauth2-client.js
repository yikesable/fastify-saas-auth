import pathModule from 'node:path';
import { URL } from 'node:url';

import fp from 'fastify-plugin';
import { fastifyOauth2 } from '@fastify/oauth2';
import got from 'got';
import { capitalizeAlpha } from './utils.js';

/** @import { FastifyPluginAsync } from 'fastify' */
/** @import { FastifyOAuth2ClientOptions } from './fastify-oauth2-client-types.js' */
/** @import { SaasAuthIssuerUserInfo } from './issuer-plugin-types.js' */

/** @type {FastifyPluginAsync<FastifyOAuth2ClientOptions>} */
const fastifyOAuth2ClientPluginFactory = async (fastify, options) => {
  const {
    baseUrl: rawBaseUrl,
    callback,
    failureRedirect,
    name,
    prefix = '',
    successRedirect,
    type,
    ...issuerOptions
  } = options;

  const {
    auth,
    clientId,
    clientSecret,
    customHeaders,
    scope,
    userProfileParse,
    userProfileUrl,
  } = issuerOptions;

  const baseUrl = new URL(rawBaseUrl);
  const prefixedBaseUrl = new URL(prefix + '/', baseUrl);
  const authUrl = new URL(name + '/', prefixedBaseUrl);
  const redirectUri = new URL('callback', authUrl);

  const capitalizedName = capitalizeAlpha(name);

  if (!capitalizedName) {
    // TODO: Better error message
    throw new Error('Invalid name');
  }

  fastify.register(fastifyOauth2, {
    name,
    ...(scope ? { scope } : {}),
    credentials: {
      auth,
      client: {
        id: clientId,
        secret: clientSecret,
      },
    },
    startRedirectPath: '/' + pathModule.relative(baseUrl.pathname, authUrl.pathname),
    callbackUri: redirectUri.toString(),
  });

  fastify.get('/' + pathModule.relative(baseUrl.pathname, redirectUri.pathname), async function (request, reply) {
    const oauth2 = this[`oauth2${capitalizedName}`];
    const oauth2Result = await oauth2?.getAccessTokenFromAuthorizationCodeFlow(request);

    // TODO: Check if scopes has differed, see: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authenticating-to-the-rest-api-with-an-oauth-app#checking-granted-scopes
    // scopes = JSON.parse(result)['scope'].split(',')
    // has_user_email_scope = scopes.include? 'user:email' || scopes.include? 'user'

    /** @type {boolean | string | URL | void} */
    let success;
    /** @type {string | undefined} */
    let userProfileResponse;
    /** @type {SaasAuthIssuerUserInfo|undefined} */
    let userinfo;

    try {
      userProfileResponse = oauth2Result && await got(userProfileUrl, {
        // TODO: Consider whether you should
        // followRedirect,
        headers: {
          // TODO: Add user-agent
          // 'user-agent': userAgent
          ...customHeaders,
          authorization: 'Bearer ' + oauth2Result.token.access_token,
        },
        resolveBodyOnly: true,
        responseType: 'text',
        // TODO: Add a timeout?
        // timeout: { request: 2000 },
      });
    } catch (err) {
      // FIXME: Be careful with logging here
      request.log.warn({ err }, 'Failed to resolve user profile');
    }

    try {
      userinfo = userProfileResponse ? await userProfileParse(userProfileResponse) : undefined;
    } catch (err) {
      request.log.error({ err }, 'Failed to parse user profile');
    }

    try {
      success = userinfo && await callback(userinfo, { name, request });
    } catch (err) {
      request.log.warn({ err }, 'Failed to set it as logged in');
      success = false;
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

    reply.redirect(redirectPath.toString());
  });
};

export const fastifyOauth2ClientPlugin = fp(fastifyOAuth2ClientPluginFactory, {
  fastify: '>=5.x',
  name: '@yikesable/fastify-oauth2-client',
});
