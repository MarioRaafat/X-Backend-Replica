export const tweets_index_config = {
    settings: {
        number_of_shards: 1,
        number_of_replicas: 1,
        analysis: {
            analyzer: {
                tweet_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase', 'stop', 'snowball'],
                },
                arabic_analyzer: {
                    type: 'arabic',
                },
                autocomplete_analyzer: {
                    type: 'custom',
                    tokenizer: 'autocomplete_tokenizer',
                    filter: ['lowercase'],
                },
                autocomplete_search_analyzer: {
                    type: 'custom',
                    tokenizer: 'standard',
                    filter: ['lowercase'],
                },
            },
            tokenizer: {
                autocomplete_tokenizer: {
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
            tweet_id: {
                type: 'keyword',
            },
            type: {
                type: 'keyword',
            },
            content: {
                type: 'text',
                analyzer: 'tweet_analyzer',
                fields: {
                    keyword: {
                        type: 'keyword',
                        ignore_above: 256,
                    },
                    autocomplete: {
                        type: 'text',
                        analyzer: 'autocomplete_analyzer',
                        search_analyzer: 'autocomplete_search_analyzer',
                    },
                    arabic: {
                        type: 'text',
                        analyzer: 'arabic_analyzer',
                    },
                },
            },
            hashtags: {
                type: 'keyword',
            },
            mentions: {
                type: 'keyword',
            },
            created_at: {
                type: 'date',
            },
            updated_at: {
                type: 'date',
            },
            num_likes: {
                type: 'integer',
            },
            num_reposts: {
                type: 'integer',
            },
            num_views: {
                type: 'integer',
            },
            num_replies: {
                type: 'integer',
            },
            num_quotes: {
                type: 'integer',
            },
            author_id: {
                type: 'keyword',
            },
            name: {
                type: 'text',
                fields: {
                    keyword: {
                        type: 'keyword',
                        ignore_above: 256,
                    },
                    autocomplete: {
                        type: 'text',
                        analyzer: 'autocomplete_analyzer',
                        search_analyzer: 'autocomplete_search_analyzer',
                    },
                    arabic: {
                        type: 'text',
                        analyzer: 'arabic_analyzer',
                    },
                },
            },
            username: {
                type: 'keyword',
            },
            followers: {
                type: 'integer',
            },
            following: {
                type: 'integer',
            },
            images: {
                type: 'keyword',
                index: false,
            },
            videos: {
                type: 'keyword',
                index: false,
            },
            bio: {
                type: 'text',
                index: false,
            },
            avatar_url: {
                type: 'keyword',
                index: false,
            },
            parent_id: {
                type: 'keyword',
            },
            conversation_id: {
                type: 'keyword',
            },
        },
    },
};
