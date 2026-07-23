// Integration boundary — added in next phase.
// Will hold the Web Push subscription/unsubscription calls to the hosted
// Elevate backend once the Interface Service exposes notification endpoints.

export function subscribeToPush() {
  return Promise.reject(new Error('Push notifications are not available until the backend is integrated.'));
}

// Static/mock content for the PoC — these examples are grounded in features
// that actually exist (Peer Connect connect/session requests, chat, and
// Community Voices recommended videos), but nothing here is triggered by
// real events yet. See PushNotification integration boundary above for what
// a live version would need.
const NOTIFICATIONS = [
  {
    id: 'n1',
    type: 'connect-accepted',
    title: 'Connect request accepted',
    body: ['Your peer ', { bold: true, text: 'Jo' }, ' has accepted your connect request!'],
  },
  {
    id: 'n2',
    type: 'new-video',
    title: 'New video added',
    body: [
      'A new video matching ',
      { bold: true, text: '"early childhood development"' },
      ' was added to your Recommended feed.',
    ],
  },
  {
    id: 'n3',
    type: 'session-pending',
    title: 'Session request pending',
    body: ['Your session request to ', { bold: true, text: 'Jo' }, ' is awaiting a response.'],
  },
  {
    id: 'n4',
    type: 'message-received',
    title: 'Message received',
    body: ['You have a new message from ', { bold: true, text: 'Jo' }, '.'],
  },
];

export function getNotifications() {
  return Promise.resolve(NOTIFICATIONS);
}
