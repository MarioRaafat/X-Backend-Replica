import { users_index_config } from './users.schema';

export const ELASTICSEARCH_INDICES = {
    USERS: 'users',
};

export const INDEX_CONFIGS = {
    [ELASTICSEARCH_INDICES.USERS]: users_index_config,
};
