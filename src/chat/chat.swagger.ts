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

export const create_chat_swagger = {
    operation: {
        summary: 'Create a new chat',
        description: `
**Start a new 1-on-1 chat**

Create a new chat between the authenticated user and another user.

**What happens:**
1. System validates that the recipient user exists
2. Checks if a chat already exists between these users
3. Creates a new chat if none exists
4. Returns the chat details

**Note:** Each pair of users can only have one chat between them.
        `,
    },

    responses: {
        success: {
            description: 'Chat created successfully',
            schema: {
                example: {
                    data: {
                        id: 'conv_123abc-def456-789ghi',
                        participants: [
                            {
                                id: 'user_456def-789abc-012ghi',
                                username: 'mariooo',
                                name: 'Mario Raafat',
                                avatar_url: 'https://ana.jpg',
                            },
                            {
                                id: 'user_789ghi-012def-345abc',
                                username: '3m el nas Messi',
                                name: 'The GOAT',
                                avatar_url: 'https://messi.jpg',
                            }
                        ],
                        created_at: '2025-10-16T10:30:00.000Z',
                        updated_at: '2025-10-16T10:30:00.000Z',
                        last_message: null,
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.CHAT_CREATED,
                },
            },
        },
    },
};

export const get_chats_swagger = {
    operation: {
        summary: 'Get user chats',
        description: `
**Retrieve all chats for the authenticated user**

Get a paginated list of chats that the authenticated user is part of, ordered by last activity.

**Features:**
- Pagination support with limit and offset
- Chats ordered by last message timestamp (newest first)
- Includes last message preview for each chat
- Shows unread message count per chat
- Includes participant information

**Response includes:**
- Chat details
- Participant information (excluding current user)
- Last message preview
- Unread message count
- Timestamps
        `,
    },

    responses: {
        success: {
            description: 'Chats retrieved successfully',
            schema: {
                example: {
                    data: [
                        {
                            id: 'chat_123abc-def456-789ghi',
                            participant: {
                                id: 'user_456def-789abc-012ghi',
                                username: 'john_doe',
                                name: 'John Doe',
                                avatar_url: 'https://example.com/avatars/john.jpg',
                            },
                            last_message: {
                                id: 'msg_789def-012abc-345ghi',
                                content: 'msa msa ya bto3 el front',
                                message_type: 'text',
                                sender_id: 'user_456def-789abc-012ghi',
                                created_at: '2025-10-16T10:45:00.000Z',
                                is_read: false,
                            },
                            unread_count: 3,
                            created_at: '2025-10-16T10:30:00.000Z',
                            updated_at: '2025-10-16T10:45:00.000Z',
                        },
                        {
                            id: 'conv_456def-789ghi-012abc',
                            participant: {
                                id: 'user_890abc-123def-456ghi',
                                username: 'alice_wonder',
                                name: 'Alice Wonder',
                                avatar_url: 'https://example.com/avatars/alice.jpg',
                            },
                            last_message: {
                                id: 'msg_345ghi-678abc-901def',
                                content: 'Thanks for the help yesterday!',
                                message_type: 'text',
                                sender_id: 'user_current_user_id',
                                created_at: '2025-10-15T18:20:00.000Z',
                                is_read: true,
                            },
                            unread_count: 0,
                            created_at: '2025-10-15T15:00:00.000Z',
                            updated_at: '2025-10-15T18:20:00.000Z',
                        }
                    ],
                    count: 2,
                    message: SUCCESS_MESSAGES.CHATS_RETRIEVED,
                },
            },
        },
    },
};

export const get_chat_swagger = {
    operation: {
        summary: 'Get chat details',
        description: `
**Retrieve specific chat details**

Get detailed information about a specific chat including participant information.

**What happens:**
1. System validates that the chat exists
2. Checks that the authenticated user is a participant
3. Returns chat details with participant info

**Use case:** Display chat header information in the chat interface.
        `,
    },

    params: {
        chat_id: chat_id_param,
    },

    responses: {
        success: {
            description: 'Chat retrieved successfully',
            schema: {
                example: {
                    data: {
                        id: 'conv_123abc-def456-789ghi',
                        participants: [
                            {
                                id: 'user_456def-789abc-012ghi',
                                username: 'mo_salah',
                                name: 'Mohamed Salah',
                                avatar_url: 'https://kgfrwqbj.jpg',
                                is_online: true,
                                last_seen: '2025-10-16T10:45:00.000Z',
                            },
                            {
                                id: 'user_current_user_id',
                                username: 'lm10',
                                name: 'Messi',
                                avatar_url: 'https://jhVW.jpg',
                                is_online: true,
                                last_seen: '2025-10-16T10:46:00.000Z',
                            }
                        ],
                        created_at: '2025-10-16T10:30:00.000Z',
                        updated_at: '2025-10-16T10:45:00.000Z',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.CHAT_RETRIEVED,
                },
            },
        },
    },
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
                        messages: [ {
                            id: 'msg_789def-012abc-345ghi',
                            content: 'take a kiss my friend 😘',
                            message_type: 'text',
                            reply_to: null,
                            is_read: false,
                            created_at: '2025-10-16T10:45:00.000Z',
                            updated_at: '2025-10-16T10:45:00.000Z',
                        }, {
                            id: 'msg_456abc-789def-012ghi',
                            content: 'el back team is top el top',
                            message_type: 'reply',
                            reply_to: 'msg_789def-012abc-345ghi',
                            is_read: true,
                            created_at: '2025-10-16T10:46:00.000Z',
                            updated_at: '2025-10-16T10:46:00.000Z',
                        }],
                    },
                    count: 2,
                    message: SUCCESS_MESSAGES.MESSAGES_RETRIEVED,
                },
            },
        },
    },
};

export const get_message_swagger = {
    operation: {
        summary: 'Get specific message details',
        description: `
**Retrieve details of a specific message**

Get detailed information about a specific message including sender details and reply context if applicable.

**What happens:**
1. System validates that the message exists
2. Checks that the authenticated user has access to the chat
3. Returns complete message details with sender and reply information

**Use case:** Get message details for actions like editing, deleting, or displaying message context.
        `,
    },

    params: {
        chat_id: chat_id_param,
        message_id: message_id_param,
    },

    responses: {
        success: {
            description: 'Message retrieved successfully',
            schema: {
                example: {
                    data: {
                        id: 'msg_456abc-789def-012ghi',
                        content: 'hi',
                        message_type: 'reply',
                        sender: {
                            id: 'user_current_user_id',
                            username: 'current_user',
                            name: 'Current User',
                            avatar_url: 'https://example.com/avatars/current.jpg',
                        },
                        chat_id: 'conv_123abc-def456-789ghi',
                        reply_to: {
                            id: 'msg_789def-012abc-345ghi',
                            content: 'hola',
                            sender: {
                                id: 'user_456def-789abc-012ghi',
                                username: 'messi_10',
                                name: 'Messi',
                                avatar_url: 'https://qlwblqehvb.jpg',
                            },
                            created_at: '2025-10-16T10:45:00.000Z',
                        },
                        is_read: true,
                        created_at: '2025-10-16T10:46:00.000Z',
                        updated_at: '2025-10-16T10:46:00.000Z',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.MESSAGE_RETRIEVED,
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

export const mark_messages_read_swagger = {
    operation: {
        summary: 'Mark messages as read',
        description: `
**Mark chat messages as read**

Mark all messages in a chat as read by the authenticated user up to a specific message.

**What happens:**
1. System validates that the chat exists
2. Checks that the authenticated user is a participant
3. Marks all messages up to the specified message as read
4. Updates read timestamps
5. Returns confirmation with read count

**Use case:** Mark messages as read when user views them in the chat interface.

**Behavior:**
- Marks all unread messages up to the specified message ID as read
- If no message ID provided, marks all messages in chat as read
- Only affects the current user's read status
- Updates read timestamp for each message
        `,
    },

    params: {
        chat_id: chat_id_param,
    },

    responses: {
        success: {
            description: 'Messages marked as read successfully',
            schema: {
                example: {
                    data: {
                        chat_id: 'conv_123abc-def456-789ghi',
                        messages_marked_read: 3,
                        last_read_message_id: 'msg_456abc-789def-012ghi',
                        read_at: '2025-10-16T11:10:00.000Z',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.MESSAGE_READ_STATUS_UPDATED,
                },
            },
        },
    },
};

export const delete_chat_swagger = {
    operation: {
        summary: 'Delete a chat',
        description: `
**Delete a chat for the authenticated user**

Remove a chat from the authenticated user's chat list. This is a soft delete operation.

**What happens:**
1. System validates that the chat exists
2. Checks that the authenticated user is a participant
3. Marks the chat as deleted for the current user only
4. The chat remains visible to the other participant
5. Returns confirmation of deletion

**Deletion Behavior:**
- Chat is hidden from the current user's chat list
- Messages remain accessible to the other participant
- If both users delete the chat, it becomes eligible for cleanup
- Deleted chats cannot be recovered by the user

**Note:** This only removes the chat from your view, not from the other participant's view.
        `,
    },

    params: {
        chat_id: chat_id_param,
    },

    responses: {
        success: {
            description: 'Chat deleted successfully',
            schema: {
                example: {
                    data: {
                        chat_id: 'chat_123abc-def456-789ghi',
                        deleted_for_user: 'user_current_user_id',
                        is_deleted: true,
                        deleted_at: '2025-10-16T11:15:00.000Z',
                    },
                    count: 1,
                    message: SUCCESS_MESSAGES.CHAT_DELETED,
                },
            },
        },
    },
};

export const search_chats_swagger = {
    operation: {
        summary: 'Search chats',
        description: `
**Search chats by participant name or username**

Search through the authenticated user's chats based on participant information.

**Search Criteria:**
- Participant name (case-insensitive partial match)
- Participant username (case-insensitive partial match)
- Returns chats where the other participant matches the search query

**Features:**
- Real-time search results
- Pagination support
- Ordered by last activity (most recent first)
- Includes chat preview with last message

**Use case:** Find specific chats in the chat list.
        `,
    },

    responses: {
        success: {
            description: 'Chats search completed',
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
                            last_message: {
                                id: 'msg_789def-012abc-345ghi',
                                content: 'Messi is the GOAT😍😍😍😍😍😍',
                                message_type: 'text',
                                sender_id: 'user_456def-789abc-012ghi',
                                created_at: '2025-10-16T10:45:00.000Z',
                                is_read: false,
                            },
                            unread_count: 3,
                            created_at: '2025-10-16T10:30:00.000Z',
                            updated_at: '2025-10-16T10:45:00.000Z',
                        }
                    ],
                    count: 1,
                    message: SUCCESS_MESSAGES.CHATS_RETRIEVED,
                },
            },
        },
    },
};