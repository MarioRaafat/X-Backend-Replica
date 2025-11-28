import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

const chat_id_param = {
    name: 'chat_id',
    description: 'Unique identifier of the chat',
    type: 'string',
    format: 'uuid',
    example: 'chat_123abc-def456-789ghi',
    required: true,
    in: 'path',
};

const message_id_param = {
    name: 'message_id',
    description: 'Unique identifier of the message',
    type: 'string',
    format: 'uuid',
    example: 'msg_456abc-789def-012ghi',
    required: true,
    in: 'path',
};

export const send_message_swagger = {
    operation: {
        summary: 'Send a message',
        description: `
**Send a message in a chat**

Send a text message in an existing chat. Messages can be regular messages or replies to other messages.

**Message Types:**
- **text**: Regular text message
- **reply**: Reply to another message (includes reference to original message)

**What happens:**
1. System validates that the chat exists
2. Checks that the authenticated user is a participant
3. For replies: validates that the message being replied to exists and belongs to the chat
4. Creates the message and updates chat timestamp
5. Returns the created message details

**Note:** Replies can only be made to original messages, not to other replies (no nested replies).
        `,
    },

    params: {
        chat_id: chat_id_param,
    },

    responses: {
        success: {
            description: 'Message sent successfully',
            schema: {
                example: {
                    data: {},
                    count: 1,
                    message: SUCCESS_MESSAGES.MESSAGE_SENT,
                },
            },
        },
    },
};

export const get_messages_swagger = {
    operation: {
        summary: 'Get chat messages',
        description: `
**Retrieve messages from a chat**

Get a paginated list of messages from a specific chat, ordered by creation time.

**Features:**
- Pagination support with limit and offset
- Messages ordered chronologically (oldest first for chat display)
- Includes sender information for each message
- Shows reply context for reply messages
- Includes read status for each message

**Query Parameters:**
- \`limit\`: Number of messages to retrieve (default: 50, max: 100)
- \`before\`: Get messages before a specific message ID (for loading older messages)

**Use case:** Display chat messages in the chat interface with proper pagination.
        `,
    },

    params: {
        chat_id: chat_id_param,
    },

    responses: {
        success: {
            description: 'Messages retrieved successfully',
            schema: {
                example: {
                    data: {
                        sender: {
                            id: 'user_456def-789abc-012ghi',
                            username: 'mariooo',
                            name: 'Mario Raafat',
                            avatar_url: 'https://wqjblkqbw.jpg',
                        },
                        messages: [
                            {
                                id: 'msg_789def-012abc-345ghi',
                                content: 'take a kiss my friend 😘',
                                message_type: 'text',
                                reply_to: null,
                                is_read: false,
                                created_at: '2025-10-16T10:45:00.000Z',
                                updated_at: '2025-10-16T10:45:00.000Z',
                            },
                            {
                                id: 'msg_456abc-789def-012ghi',
                                content: 'el back team is top el top',
                                message_type: 'reply',
                                reply_to: 'msg_789def-012abc-345ghi',
                                is_read: true,
                                created_at: '2025-10-16T10:46:00.000Z',
                                updated_at: '2025-10-16T10:46:00.000Z',
                            },
                        ],
                    },
                    count: 2,
                    message: SUCCESS_MESSAGES.MESSAGES_RETRIEVED,
                },
            },
        },
    },
};

export const update_message_swagger = {
    operation: {
        summary: 'Update/Edit a message',
        description: `
**Edit an existing message**

Update the content of a message that was sent by the authenticated user.

**What happens:**
1. System validates that the message exists
2. Checks that the authenticated user is the sender of the message
3. Updates the message content
4. Updates the message timestamp
5. Returns the updated message details

**Restrictions:**
- Only the sender can edit their own messages
- Message type cannot be changed
- Reply references cannot be modified

**Note:** Edited messages will show an "edited" indicator with the update timestamp.
        `,
    },

    params: {
        chat_id: chat_id_param,
        message_id: message_id_param,
    },

    responses: {
        success: {
            description: 'Message updated successfully',
            schema: {
                example: {
                    data: {
                        id: 'msg_456abc-789def-012ghi',
                        content: 'Messi is the GOAT',
                        message_type: 'reply',
                        updated_at: '2025-10-16T11:00:00.000Z',
                        is_edited: true,
                    },
                    count: 0,
                    message: SUCCESS_MESSAGES.MESSAGE_UPDATED,
                },
            },
        },
    },
};

export const delete_message_swagger = {
    operation: {
        summary: 'Delete a message',
        description: `
**Delete an existing message**

Delete a message that was sent by the authenticated user.

**What happens:**
1. System validates that the message exists
2. Checks that the authenticated user is the sender of the message
3. Soft deletes the message (marks as deleted but keeps for reply references)
4. Returns confirmation of deletion

**Deletion Behavior:**
- Message content is replaced with "This message was deleted"
- Message is marked as deleted but not physically removed
- Reply references to deleted messages remain intact
- Only the sender can delete their own messages

**Note:** Deleted messages cannot be recovered.
        `,
    },

    params: {
        chat_id: chat_id_param,
        message_id: message_id_param,
    },

    responses: {
        success: {
            description: 'Message deleted successfully',
            schema: {
                example: {
                    data: {
                        id: 'msg_456abc-789def-012ghi',
                        is_deleted: true,
                        deleted_at: '2025-10-16T11:05:00.000Z',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.MESSAGE_DELETED,
                },
            },
        },
    },
};

export const search_messages_swagger = {
    operation: {
        summary: 'Search messages',
        description: `
**Search messages by content**

Search through the authenticated user's messages based on message content.

**Search Criteria:**
- Message content (case-insensitive partial match)

**Use case:** Find specific messages in the message list.
        `,
    },

    responses: {
        success: {
            description: 'Messages retrieved successfully',
            schema: {
                example: {
                    data: [
                        {
                            id: 'chat_123abc-def456-789ghi',
                            participant: {
                                id: 'user_456def-789abc-012ghi',
                                username: 'messi_10',
                                name: 'Lionel Messi',
                                avatar_url: 'https://lqwhbl.jpg',
                            },
                            message: {
                                id: 'msg_789def-012abc-345ghi',
                                content: 'Messi is the GOAT😍😍😍😍😍😍',
                                message_type: 'text',
                                sender_id: 'user_456def-789abc-012ghi',
                                created_at: '2025-10-16T10:45:00.000Z',
                                is_read: false,
                            },
                            created_at: '2025-10-16T10:30:00.000Z',
                            updated_at: '2025-10-16T10:45:00.000Z',
                        },
                    ],
                    count: 1,
                    message: SUCCESS_MESSAGES.MESSAGES_RETRIEVED,
                },
            },
        },
    },
};
