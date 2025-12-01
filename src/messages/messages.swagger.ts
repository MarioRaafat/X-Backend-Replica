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

export const websocket_docs_swagger = {
    operation: {
        summary: 'WebSocket Gateway Documentation',
        description: `
# Real-Time Messaging WebSocket Gateway

**Namespace:** \`/messages\`  
**Authentication:** JWT token required (pass via \`auth\` query parameter or authorization header)

---

## 🔌 Connection

**URL:** \`ws://your-domain/messages?auth=YOUR_JWT_TOKEN\`

**On Connect:**
- Client is authenticated via JWT token
- User's socket ID is registered for multi-device support
- Client receives \`unread_chats_summary\` event if there are unread messages

**Emitted Event on Connection:**
\`\`\`json
Event: "unread_chats_summary"
{
  "chats": [
    {
      "chat_id": "chat_123abc-def456-789ghi",
      "unread_count": 5,
      "last_message": {
        "id": "msg_789def-012abc-345ghi",
        "content": "Hey, are you there?",
        "created_at": "2025-11-29T10:45:00.000Z"
      }
    }
  ],
  "message": "You have unread messages in these chats"
}
\`\`\`

---

## 📨 Available Events (Client → Server)

### 1. **join_chat**
Join a chat room to receive real-time messages and reset unread counter.

**Emit:**
\`\`\`json
{
  "chat_id": "chat_123abc-def456-789ghi"
}
\`\`\`

**Response:**
\`\`\`json
{
  "event": "joined_chat",
  "data": {
    "chat_id": "chat_123abc-def456-789ghi",
    "message": "Successfully joined chat"
  }
}
\`\`\`

**What Happens:**
- User joins the chat room
- Unread counter for this user is reset to 0
- User will now receive real-time messages from this chat

---

### 2. **leave_chat**
Leave a chat room to stop receiving real-time messages.

**Emit:**
\`\`\`json
{
  "chat_id": "chat_123abc-def456-789ghi"
}
\`\`\`

**Response:**
\`\`\`json
{
  "event": "left_chat",
  "data": {
    "chat_id": "chat_123abc-def456-789ghi",
    "message": "Successfully left chat"
  }
}
\`\`\`

---

### 3. **send_message**
Send a new message in a chat.

**Emit:**
\`\`\`json
{
  "chat_id": "chat_123abc-def456-789ghi",
  "message": {
    "content": "Hello, how are you?",
    "message_type": "text",
    "reply_to": null
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "event": "message_sent",
  "data": {
    "id": "msg_456abc-789def-012ghi",
    "content": "Hello, how are you?",
    "sender_id": "user_123abc",
    "is_read": true,
    "created_at": "2025-11-29T10:45:00.000Z"
  }
}
\`\`\`

**Recipient Receives:**
\`\`\`json
Event: "new_message"
{
  "chat_id": "chat_123abc-def456-789ghi",
  "message": {
    "id": "msg_456abc-789def-012ghi",
    "content": "Hello, how are you?",
    "sender_id": "user_123abc",
    "is_read": true,
    "created_at": "2025-11-29T10:45:00.000Z"
  }
}
\`\`\`

**Smart Read Status Logic:**
- If recipient is in the chat room: message marked as read (\`is_read: true\`), unread counter NOT incremented
- If recipient NOT in chat room: message marked as unread (\`is_read: false\`), unread counter incremented

---

### 4. **update_message**
Edit an existing message.

**Emit:**
\`\`\`json
{
  "chat_id": "chat_123abc-def456-789ghi",
  "message_id": "msg_456abc-789def-012ghi",
  "update": {
    "content": "Hello, how are you doing?"
  }
}
\`\`\`

**Response:**
\`\`\`json
{
  "event": "message_updated",
  "data": {
    "id": "msg_456abc-789def-012ghi",
    "content": "Hello, how are you doing?",
    "updated_at": "2025-11-29T10:50:00.000Z"
  }
}
\`\`\`

**Recipient Receives:**
\`\`\`json
Event: "message_updated"
{
  "chat_id": "chat_123abc-def456-789ghi",
  "message_id": "msg_456abc-789def-012ghi",
  "message": { /* updated message data */ }
}
\`\`\`

---

### 5. **delete_message**
Delete a message you sent.

**Emit:**
\`\`\`json
{
  "chat_id": "chat_123abc-def456-789ghi",
  "message_id": "msg_456abc-789def-012ghi"
}
\`\`\`

**Response:**
\`\`\`json
{
  "event": "message_deleted",
  "data": {
    "id": "msg_456abc-789def-012ghi",
    "is_deleted": true
  }
}
\`\`\`

**Recipient Receives:**
\`\`\`json
Event: "message_deleted"
{
  "chat_id": "chat_123abc-def456-789ghi",
  "message_id": "msg_456abc-789def-012ghi"
}
\`\`\`

---

### 6. **typing_start**
Notify the other user that you started typing.

**Emit:**
\`\`\`json
{
  "chat_id": "chat_123abc-def456-789ghi"
}
\`\`\`

**Response:**
\`\`\`json
{
  "event": "typing_started",
  "data": {
    "chat_id": "chat_123abc-def456-789ghi"
  }
}
\`\`\`

**Recipient Receives:**
\`\`\`json
Event: "user_typing"
{
  "chat_id": "chat_123abc-def456-789ghi",
  "user_id": "user_123abc"
}
\`\`\`

---

### 7. **typing_stop**
Notify the other user that you stopped typing.

**Emit:**
\`\`\`json
{
  "chat_id": "chat_123abc-def456-789ghi"
}
\`\`\`

**Response:**
\`\`\`json
{
  "event": "typing_stopped",
  "data": {
    "chat_id": "chat_123abc-def456-789ghi"
  }
}
\`\`\`

**Recipient Receives:**
\`\`\`json
Event: "user_stopped_typing"
{
  "chat_id": "chat_123abc-def456-789ghi",
  "user_id": "user_123abc"
}
\`\`\`

---

### 8. **get_messages**
Retrieve paginated messages from a chat using cursor-based pagination.

**Emit:**
\`\`\`json
{
  "chat_id": "chat_123abc-def456-789ghi",
  "limit": 50,
  "before": "msg_456abc-789def-012ghi"
}
\`\`\`

**Parameters:**
- \`chat_id\` (required): The chat ID to retrieve messages from
- \`limit\` (optional): Number of messages to retrieve (default: 50, max: 100)
- \`before\` (optional): Message ID cursor for pagination (get messages before this message)

**Response:**
\`\`\`json
{
  "event": "messages_retrieved",
  "data": {
    "chat_id": "chat_123abc-def456-789ghi",
    "sender": {
      "id": "user_456def-789abc-012ghi",
      "username": "mariooo",
      "name": "Mario Raafat",
      "avatar_url": "https://example.com/avatar.jpg"
    },
    "messages": [
      {
        "id": "msg_789def-012abc-345ghi",
        "content": "Hello!",
        "message_type": "text",
        "reply_to": null,
        "is_read": true,
        "is_edited": false,
        "created_at": "2025-11-29T10:45:00.000Z",
        "updated_at": "2025-11-29T10:45:00.000Z",
        "sender": {
          "id": "user_123abc",
          "username": "john_doe",
          "name": "John Doe",
          "avatar_url": "https://example.com/john.jpg"
        }
      }
    ],
    "has_more": true,
    "next_cursor": "msg_789def-012abc-345ghi"
  }
}
\`\`\`

**Pagination:**
- Messages are returned in chronological order (oldest first)
- Use \`next_cursor\` in the \`before\` field to load older messages
- \`has_more\` indicates if there are more messages to load
- If \`has_more\` is false, you've reached the beginning of the chat

**Example Pagination Flow:**
1. Initial load: \`{ "chat_id": "chat_123", "limit": 50 }\`
2. Load older: \`{ "chat_id": "chat_123", "limit": 50, "before": "msg_last_id" }\`
3. Continue until \`has_more\` is false

---

## 📬 Server Events (Server → Client)

### **unread_chats_summary**
Sent automatically on connection if user has unread messages.

### **new_message**
Sent when someone sends a message in a chat you're part of.

### **message_updated**
Sent when someone edits a message in your chat.

### **message_deleted**
Sent when someone deletes a message in your chat.

### **user_typing**
Sent when the other user starts typing.

### **user_stopped_typing**
Sent when the other user stops typing.

### **joined_chat**
Confirmation that you successfully joined a chat room.

### **left_chat**
Confirmation that you successfully left a chat room.

### **message_sent**
Confirmation that your message was sent successfully.

### **messages_retrieved**
Response containing paginated messages from a chat.

### **error**
Sent when an error occurs during any operation.

\`\`\`json
{
  "event": "error",
  "data": {
    "message": "Error description"
  }
}
\`\`\`
`,
    },

    responses: {
        success: {
            description: 'WebSocket documentation information',
            schema: {
                example: {
                    message: 'WebSocket documentation available in Swagger UI',
                    namespace: '/messages',
                    events: {
                        client_to_server: [
                            'join_chat',
                            'leave_chat',
                            'send_message',
                            'update_message',
                            'delete_message',
                            'typing_start',
                            'typing_stop',
                            'get_messages',
                        ],
                        server_to_client: [
                            'unread_chats_summary',
                            'new_message',
                            'message_updated',
                            'message_deleted',
                            'user_typing',
                            'user_stopped_typing',
                            'joined_chat',
                            'left_chat',
                            'message_sent',
                            'messages_retrieved',
                            'error',
                        ],
                    },
                },
            },
        },
    },
};
