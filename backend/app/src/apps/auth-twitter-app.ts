import { 
  APIGatewayProxyEvent, 
  APIGatewayProxyResult 
} from "aws-lambda";
import { DataMapper } from '@aws/dynamodb-data-mapper';
import DynamoDB = require('aws-sdk/clients/dynamodb');

import TwitterApi from 'twitter-api-v2';
import { UserAuthDetail } from "src/data-types/user-auth-detail";
import { getCookiesFromHeader } from "src/common/util";

/*
 * FILL THE VALUES BELOW FROM YOUR TWITTER APP
 */
const CONSUMER_KEY = '__CONSUMER_KEY__';
const CONSUMER_SECRET = '__COMSUMER_SECRET__';

const CLIENT_REDIRECT_URL = 'http%3A%2F%2Flocalhost%3A3000';
const CROSS_ORIGIN = 'http://localhost:3000';
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': CROSS_ORIGIN,
  'Access-Control-Allow-Credentials': true
};

export class AuthTwitterApp {

  async requestToken(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log('[INFO] Running AuthTwitterApp.requestToken()');

    try {

      const twitterClient = new TwitterApi({
        appKey: CONSUMER_KEY,
        appSecret: CONSUMER_SECRET
      });

      // 1. Request token from twitter
      const authLink = await twitterClient.generateAuthLink(CLIENT_REDIRECT_URL);
      
      // 2. Confirm if the callback was confirmed to be correct by twitter
      if (authLink.oauth_callback_confirmed !== 'true') {
        return {
          statusCode: 400,
          body: `Callback not confirmed. Response: ${JSON.stringify(authLink)}`
        }
      }

      // 3. Store the token and secret (used in subsequent authentication steps)
      const mapper = new DataMapper({ client: new DynamoDB({ region: process.env.REGION_NAME }) });

      const authDetailItem: UserAuthDetail = new UserAuthDetail();
      authDetailItem.oauthToken = authLink.oauth_token;
      authDetailItem.oauthTokenSecret = authLink.oauth_token_secret;

      const response = await mapper.put({ item: authDetailItem });
      if (!response) {
        return {
          statusCode: 500,
          body: `Failed to store auth details. Response: ${response}`
        };
      }

      // 4. Respond to client with the oauth token
      return {
        statusCode: 200,
        body: JSON.stringify({ oauth_url: authLink.url, oauth_token: authLink.oauth_token }),

        // TODO: Setting cookie from the server not working - try again with same-origin web client
        headers: {
          ...CORS_HEADERS,
          'Set-Cookie': `oauth_token=${authLink.oauth_token}; Max-Age: ${15 * 60 * 1000}; Path=/; Secure; SameSite=None`
        }
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({message: `Internal server error. ${error}`})
      };
    }
  }

  async accessToken(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log('[INFO] Running AuthTwitterApp.accessToken()');

    try {
      const {oauth_token: req_oauth_token, oauth_verifier} = JSON.parse(event.body);

      const cookies = getCookiesFromHeader(event.headers);
      const oauth_token = cookies['oauth_token'];
      
      // 1. Verify that the OAuth Token in the request and the cookie match
      if (oauth_token !== req_oauth_token) {
        return {
          statusCode: 403,
          body: JSON.stringify({ message: "Request tokens do not match" })
        };
      }
      
      // 2. Get the user auth detail object from storage (to get the token secret)
      const mapper = new DataMapper({ client: new DynamoDB({ region: process.env.REGION_NAME }) });
      let authDetailItem: UserAuthDetail;

      try {
        authDetailItem = await mapper.get(Object.assign(new UserAuthDetail, {oauthToken: oauth_token}));
      } catch (err) {
        console.error(`[ERROR] accessToken: OAuth Token not found: ${oauth_token}`);
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Request received from unidentified user' })
        };
      }

      const oauth_token_secret = authDetailItem.oauthTokenSecret;
      if (!oauth_token || !oauth_verifier || !oauth_token_secret) {
        return {
          statusCode: 400,
          body: 'You denied the app or your session expired!'
        };
      }

      // 3. Invoke Twitter API `oauth/access_token` to fetch the access token 
      const client = new TwitterApi({
        appKey: CONSUMER_KEY,
        appSecret: CONSUMER_SECRET,
        accessToken: oauth_token,
        accessSecret: oauth_token_secret,
      });

      const loginResult = await client.login(oauth_verifier);
      
      // 4. Persist the access token in storage
      authDetailItem.oauthAccessToken = loginResult.accessToken;
      authDetailItem.oauthAccessTokenSecret = loginResult.accessSecret;
      authDetailItem.userId = loginResult.userId;
      authDetailItem.screenName = loginResult.screenName;
      const response = await mapper.put({ item: authDetailItem });
      if (!response) {
        return {
          statusCode: 500,
          body: `Failed to store auth details. Response: ${response}`
        };
      }

      // 5. Respond to client with success
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          screenName: loginResult.screenName,
          userId: loginResult.userId
        }),
        headers: {
          ...CORS_HEADERS
        }
      };      
    } catch(error) {
      return {
        statusCode: 500,
        body: JSON.stringify({message: `Internal server error. ${error}`})
      };
    }
  }

  async logout(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log('[INFO] Running AuthTwitterApp.logout()');

    try {
      const cookies = getCookiesFromHeader(event.headers);
      const oauth_token = cookies['oauth_token'];

      const mapper = new DataMapper({ client: new DynamoDB({ region: process.env.REGION_NAME }) });
      await mapper.delete((Object.assign(new UserAuthDetail, { oauthToken: oauth_token })));

      return {
        statusCode: 200,
        body: '',
        headers: {
          ...CORS_HEADERS
        }
      };
    } catch(error) {
      return {
        statusCode: 500,
        body: JSON.stringify({message: `Internal server error. ${error}`})
      };
    }
  }
}
