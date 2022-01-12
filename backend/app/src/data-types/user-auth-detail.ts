import {
  attribute,
  hashKey,
  table
} from '@aws/dynamodb-data-mapper-annotations';

@table('UserAuthDetail')
export class UserAuthDetail {
  @hashKey()
  oauthToken: string;

  @attribute()
  oauthTokenSecret: string;

  @attribute()
  oauthAccessToken: string;

  @attribute()
  oauthAccessTokenSecret: string;

  @attribute()
  userId: string;

  @attribute()
  screenName: string;
}