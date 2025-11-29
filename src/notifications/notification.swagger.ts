// import { NotificationType } from "./enums/notification-types";

// export const FRONTEND_NOTIFICATIONS_GUIDE = {

//     critical_instructions: {
//         order: [
//             '1. Connect to WebSocket FIRST using Socket.IO with JWT token',
//             '2. Wait for connection confirmation ("connect" event)',
//             '3. THEN call GET /notifications to fetch historical data',
//             '4. Listen to notification events on Socket.IO',
//             '5. Handle "add" and "remove" actions',
//         ],

//         warnings: [
//             'You MUST connect to WebSocket BEFORE fetching from REST API',
//             'There is a small probability of receiving duplicate notifications - implement deduplication',
//         ],
//     },

//     socket_events: {
//         description: 'Listen to these 5 events:',
//         events: [
//             NotificationType.LIKE,
//             NotificationType.REPLY,
//             NotificationType.QUOTE,
//             NotificationType.REPOST,
//             NotificationType.FOLLOW,
//         ],
//     },

//     actions: {
//         add: {
//             description: 'New notification (someone liked, followed, etc.)',
//             what_to_do: 'Add this notification to your UI list',
//         },
//         remove: {
//             description: 'Undo notification (someone unliked, unfollowed, etc.)',
//             what_to_do: 'Remove the matching notification from your UI list',
//         },
//     },

//     implementation_example: `
//         import io from 'socket.io-client';

//         // ===== STEP 1: Connect to WebSocket =====
//         const socket = io('ws://localhost:3000', {
//             auth: { token: 'your-jwt-token' }
//         });

//         socket.on('connect', async () => {
//             console.log('✅ Connected');

//             // ===== STEP 2: Fetch historical notifications =====
//             const response = await fetch('http://localhost:3000/notifications', {
//                 headers: { 'Authorization': 'Bearer your-jwt-token' }
//             });
//             const notifications = await response.json();

//             // Display them
//             updateUI(notifications);
//         });

//         // ===== STEP 3: Listen to events =====
//         socket.on('like', (data) => {
//             if (data.action === 'add') {
//                 // Add to your list
//             } else if (data.action === 'remove') {
//                 // Remove from your list
//             }
//         });

//         socket.on('reply', (data) => { /* same logic */ });
//         socket.on('quote', (data) => { /* same logic */ });
//         socket.on('repost', (data) => { /* same logic */ });
//         socket.on('follow', (data) => { /* same logic */ });
//     `,
// };
