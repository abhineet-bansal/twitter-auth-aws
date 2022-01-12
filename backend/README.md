# Twitter Auth - Backend

The backend app for the Twitter Auth app.

AWS API Gateway creates the public endpoint that is accessed by the frontend app. The following 3 APIs are exposed:
1. `/auth/request_token`
2. `/auth/access_token`
3. `/auth/logout`

Requests to the endpoint are proxied to the Lambda function (a single function to handle all 3 kind of requests).

DynamoDB table `UserAuthDetail` is used to store the OAuth Token Secret and the Access Token which can be used by the backend to invoke Twitter APIs after the auth is completed successfully.

## Requirements

1. node (> 12.x)
2. npm
3. SAM CLI
4. AWS Account

## Setup Instructions

From your Twitter app, get the consumer key and secret, and put those in `app/src/apps/auth-twitter-app.ts`. Then:

```
$ cd app
$ npm i
$ npm run compile
$ cd ..
$ sam build
$ sam deploy
```
