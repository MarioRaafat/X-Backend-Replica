// Socket.IO Events Type Definitions
// Use this file for TypeScript client implementations

export interface ISocketAuthPayload {
    token: string;
}

// ============ OUTGOING EVENTS (Client -> Server) ============

export interface IJoinChatPayload {
    chat_id: string;
}

export interface ILeaveChatPayload {
    chat_id: string;
}

export interface ISendMessagePayload {
    chat_id: string;
    message: {
        content: string;
        message_type?: 'text' | 'reply';
        reply_to_message_id?: string;
    };
}

export interface IGetMessagesPayload {
    chat_id: string;
    query?: {
        limit?: number; // default: 50, max: 100
        before?: string; // message_id for pagination
    };
}

export interface IUpdateMessagePayload {
    chat_id: string;
    message_id: string;
    update: {
        content: string;
    };
}

export interface IDeleteMessagePayload {
    chat_id: string;
    message_id: string;
}

export interface ITypingStartPayload {
    chat_id: string;
}

export interface ITypingStopPayload {
    chat_id: string;
}

// ============ INCOMING EVENTS (Server -> Client) ============

export interface IJoinedChatResponse {
    event: 'joined_chat';
    data: {
        chat_id: string;
        message: string;
    };
}

export interface ILeftChatResponse {
    event: 'left_chat';
    data: {
        chat_id: string;
        message: string;
    };
}

export interface IMessageSentResponse {
    event: 'message_sent';
    data: {
        id: string;
        content: string;
        message_type: 'text' | 'reply';
        sender_id: string;
        chat_id: string;
        reply_to_message_id: string | null;
        is_read: boolean;
        is_edited: boolean;
        is_deleted: boolean;
        created_at: string;
        updated_at: string;
        sender: {
            id: string;
            username: string;
            name: string;
            avatar_url: string | null;
        };
    };
}

export interface INewMessageBroadcast {
    chat_id: string;
    message: {
        id: string;
        content: string;
        message_type: 'text' | 'reply';
        sender_id: string;
        reply_to_message_id: string | null;
        is_read: boolean;
        is_edited: boolean;
        created_at: string;
        updated_at: string;
        sender: {
            id: string;
            username: string;
            name: string;
            avatar_url: string | null;
        };
    };
}

export interface IMessagesRetrievedResponse {
    event: 'messages_retrieved';
    data: {
        sender: {
            id: string;
            username: string;
            name: string;
            avatar_url: string | null;
        };
        messages: Array<{
            id: string;
            content: string;
            message_type: 'text' | 'reply';
            reply_to: string | null;
            is_read: boolean;
            is_edited: boolean;
            created_at: string;
            updated_at: string;
            sender: {
                id: string;
                username: string;
                name: string;
                avatar_url: string | null;
            };
        }>;
    };
}

export interface IMessageUpdatedBroadcast {
    chat_id: string;
    message_id: string;
    message: {
        id: string;
        content: string;
        message_type: 'text' | 'reply';
        updated_at: string;
        is_edited: boolean;
    };
}

export interface IMessageDeletedBroadcast {
    chat_id: string;
    message_id: string;
}

export interface IUserTypingBroadcast {
    chat_id: string;
    user_id: string;
    username: string;
}

export interface IUserStoppedTypingBroadcast {
    chat_id: string;
    user_id: string;
}

export interface IErrorResponse {
    event: 'error';
    data: {
        message: string;
    };
}

// ============ SOCKET EVENT NAMES ============

export const SocketEvents = {
    // Connection
    CONNECT: 'connect',
    DISCONNECT: 'disconnect',

    // Outgoing
    JOIN_CHAT: 'join_chat',
    LEAVE_CHAT: 'leave_chat',
    SEND_MESSAGE: 'send_message',
    GET_MESSAGES: 'get_messages',
    UPDATE_MESSAGE: 'update_message',
    DELETE_MESSAGE: 'delete_message',
    TYPING_START: 'typing_start',
    TYPING_STOP: 'typing_stop',

    // Incoming
    JOINED_CHAT: 'joined_chat',
    LEFT_CHAT: 'left_chat',
    MESSAGE_SENT: 'message_sent',
    NEW_MESSAGE: 'new_message',
    MESSAGES_RETRIEVED: 'messages_retrieved',
    MESSAGE_UPDATED: 'message_updated',
    MESSAGE_DELETED: 'message_deleted',
    USER_TYPING: 'user_typing',
    USER_STOPPED_TYPING: 'user_stopped_typing',
    ERROR: 'error',
} as const;
