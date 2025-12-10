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
                            },
                        ],
                        created_at: '2025-10-16T10:30:00.000Z',
                        updated_at: '2025-10-16T10:30:00.000Z',
                        last_message: null,
                    },
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
                    data: {
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
                            },
                        ],
                        pagination: {
                            next_cursor:
                                'eyJ1cGRhdGVkX2F0IjoiMjAyNS0xMC0xNVQxODoyMDowMC4wMDBaIiwiaWQiOiJjb252XzQ1NmRlZi03ODlnaGktMDEyYWJjIn0=',
                            has_more: false,
                        },
                    },
                    count: 2,
                    message: SUCCESS_MESSAGES.CHATS_RETRIEVED,
                },
            },
        },
    },
};

export const get_chat_by_id_swagger = {
    operation: {
        summary: 'Get chat by ID',
        description: `
**Retrieve a specific chat by ID**

Get details of a specific chat conversation that the authenticated user is part of.

**What happens:**
1. System validates that the chat exists
2. Checks that the authenticated user is a participant in the chat
3. Returns the chat details with participant info and last message

**Response includes:**
- Chat ID
- Participant information (excluding current user)
- Last message details
- Unread message count
- Created and updated timestamps

**Note:** You can only view chats that you are a participant in.
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
                        id: 'chat_123abc-def456-789ghi',
                        participant: {
                            id: 'user_456def-789abc-012ghi',
                            username: 'mariooo',
                            name: 'Mario Raafat',
                            avatar_url: 'https://ana.jpg',
                        },
                        last_message: {
                            id: 'msg_789def-012abc-345ghi',
                            content: 'Hey, how are you?',
                            message_type: 'text',
                            sender_id: 'user_456def-789abc-012ghi',
                            created_at: '2025-10-16T10:45:00.000Z',
                            is_read: false,
                        },
                        unread_count: 2,
                        created_at: '2025-10-16T10:30:00.000Z',
                        updated_at: '2025-10-16T10:45:00.000Z',
                    },
                    message: SUCCESS_MESSAGES.CHAT_RETRIEVED,
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
                        read_at: '2025-10-16T11:10:00.000Z',
                    },
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
                    message: SUCCESS_MESSAGES.CHAT_DELETED,
                },
            },
        },
    },
};
