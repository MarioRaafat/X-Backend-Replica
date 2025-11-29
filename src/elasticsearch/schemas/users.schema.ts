export const users_index_config = {
    settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
        analysis: {
            analyzer: {
                username_analyzer: {
                    type: 'custom',
                    tokenizer: 'keyword',
                    filter: ['lowercase'],
                },
                autocomplete_analyzer: {
                    type: 'custom',
                    tokenizer: 'edge_ngram_tokenizer',
                    filter: ['lowercase'],
                },
                autocomplete_search_analyzer: {
                    type: 'custom',
                    tokenizer: 'keyword',
                    filter: ['lowercase'],
                },
            },
            tokenizer: {
                edge_ngram_tokenizer: {
                    type: 'edge_ngram',
                    min_gram: 2,
                    max_gram: 20,
                    token_chars: ['letter', 'digit'],
                },
            },
        },
    },
    mappings: {
        properties: {
            user_id: { type: 'keyword' },
            username: {
                type: 'text',
                analyzer: 'username_analyzer',
                fields: {
                    keyword: { type: 'keyword' },
                    autocomplete: {
                        type: 'text',
                        analyzer: 'autocomplete_analyzer',
                        search_analyzer: 'autocomplete_search_analyzer',
                    },
                },
            },
            name: {
                type: 'text',
                fields: {
                    keyword: { type: 'keyword' },
                    autocomplete: {
                        type: 'text',
                        analyzer: 'autocomplete_analyzer',
                        search_analyzer: 'autocomplete_search_analyzer',
                    },
                },
            },
            followers: { type: 'integer' },
            following: { type: 'integer' },
            verified: { type: 'boolean' },
            bio: { type: 'text' },
            avatar_url: { type: 'keyword', index: false },
            country: { type: 'keyword' },
        },
    },
};
