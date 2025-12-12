import { tweets_index_config } from './tweets.schema';

export const ELASTICSEARCH_INDICES = {
    TWEETS: 'tweets',
};

export const INDEX_CONFIGS = {
    [ELASTICSEARCH_INDICES.TWEETS]: tweets_index_config,
};
