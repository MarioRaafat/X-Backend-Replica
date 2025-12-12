import { SUCCESS_MESSAGES } from '../constants/swagger-messages';

export const register_device_token_swagger = {
    operation: {
        summary: 'Register device token for push notifications',
        description: `
**Register FCM Device Token**

Registers a Firebase Cloud Messaging (FCM) device token for the authenticated user. This token enables the backend to send push notifications to the user's device when they are offline or not actively connected to the WebSocket.

**How it works:**
1. Client obtains FCM token from Firebase SDK on their device
2. Client sends the token to this endpoint
3. Backend stores the token associated with the user's account
4. When notifications occur and user is offline, backend sends push notification via FCM

**When to use:**
- After user logs in on a new device
- After user grants notification permissions
- When FCM token is refreshed by Firebase SDK

**Important:**
- Only one token per user is stored (latest token overwrites previous one)
- Token must be a valid FCM device token from Firebase
- User must be authenticated with a valid JWT token
        `,
    },

    body: {
        description: 'FCM device token object',
        schema: {
            type: 'object',
            required: ['token'],
            properties: {
                token: {
                    type: 'string',
                    description: 'Firebase Cloud Messaging device token obtained from Firebase SDK',
                    example: 'fL7xKqZ9TqO:APA91bH7VZ3wFpQqZ9TqO_example_token_string_here',
                },
            },
        },
    },

    responses: {
        success: {
            description: 'Device token registered successfully',
            schema: {
                example: {
                    success: true,
                    message: 'Device token registered successfully',
                },
            },
        },
        badRequest: {
            description: 'Invalid or missing token',
            schema: {
                example: {
                    statusCode: 400,
                    message: 'Invalid token format',
                    error: 'Bad Request',
                },
            },
        },
        unauthorized: {
            description: 'User not authenticated',
            schema: {
                example: {
                    statusCode: 401,
                    message: 'Unauthorized',
                },
            },
        },
    },
};

export const remove_device_token_swagger = {
    operation: {
        summary: 'Remove device token',
        description: `
**Remove FCM Device Token**

Removes the FCM device token for the authenticated user. This stops the backend from sending push notifications to this device.

**When to use:**
- User logs out from the device
- User disables push notifications in app settings
- User uninstalls the app
- Device token becomes invalid or expired

**What happens:**
1. Backend removes the stored FCM token for the user
2. User will no longer receive push notifications on this device
3. User can still receive real-time notifications via WebSocket when connected

**Note:**
- This only affects push notifications (FCM)
- WebSocket notifications continue to work when user is online
- User needs to register a new token to re-enable push notifications
        `,
    },

    responses: {
        success: {
            description: 'Device token removed successfully',
            schema: {
                example: {
                    success: true,
                    message: 'Device token removed successfully',
                },
            },
        },
        unauthorized: {
            description: 'User not authenticated',
            schema: {
                example: {
                    statusCode: 401,
                    message: 'Unauthorized',
                },
            },
        },
    },
};

// Additional documentation for understanding the notification flow
export const FCM_NOTIFICATION_TYPES = {
    description: `
**Push Notification Types**

The system sends push notifications via FCM for the following events when the user is offline:

1. **LIKE**: Someone liked your tweet
   - Title: "New Like"
   - Body: "[Username] liked your tweet"

2. **REPLY**: Someone replied to your tweet
   - Title: "New Reply"
   - Body: "[Username] replied to your tweet"

3. **REPOST**: Someone reposted your tweet
   - Title: "New Repost"
   - Body: "[Username] reposted your tweet"

4. **QUOTE**: Someone quoted your tweet
   - Title: "New Quote"
   - Body: "[Username] quoted your tweet"

5. **FOLLOW**: Someone followed you
   - Title: "New Follower"
   - Body: "[Username] started following you"

6. **MENTION**: Someone mentioned you in a tweet
   - Title: "New Mention"
   - Body: "[Username] mentioned you in a tweet"

7. **MESSAGE**: Someone sent you a message
   - Title: "[Sender's name]"
   - Body: "[Message content]"

**Notification Delivery Logic:**
- **User Online**: Notification sent via WebSocket (real-time)
- **User Offline**: Notification sent via FCM push notification (requires registered device token)

**Data Payload:**
All push notifications include additional data in the payload that can be used by the mobile app to navigate to the relevant screen or display rich content.
    `,
};
