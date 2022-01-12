import { 
    APIGatewayProxyEvent, 
    APIGatewayProxyResult 
  } from "aws-lambda";
import { AuthTwitterApp } from '../apps/auth-twitter-app';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {

    const app:AuthTwitterApp = new AuthTwitterApp();

    if (event.resource === '/auth/request_token') {
        return await app.requestToken(event);
    } else if (event.resource === '/auth/access_token') {
        return await app.accessToken(event);
    } else if (event.resource === '/auth/logout') {
        return await app.logout(event);
    }

    return {
        statusCode: 500,
        body: JSON.stringify({ message: 'Unsupported operation' })
    };
};