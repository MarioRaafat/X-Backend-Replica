import { tweets_index_config } from './tweets.schema';
import { users_index_config } from './users.schema';

export const ELASTICSEARCH_INDICES = {
    USERS: 'users',
    TWEETS: 'tweets',
};

export const INDEX_CONFIGS = {
    [ELASTICSEARCH_INDICES.USERS]: users_index_config,
    [ELASTICSEARCH_INDICES.TWEETS]: tweets_index_config,
};
