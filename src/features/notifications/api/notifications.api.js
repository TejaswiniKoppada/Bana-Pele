// Integration boundary — added in next phase.
// Will hold the Web Push subscription/unsubscription calls to the hosted
// Elevate backend once the Interface Service exposes notification endpoints.

import { getPendingRecommendationGroups } from "@/services/learningService";

export function subscribeToPush() {
  return Promise.reject(
    new Error(
      "Push notifications are not available until the backend is integrated.",
    ),
  );
}

/**
 * The one real, DB-backed notification in this list — everything else
 * below (NOTIFICATIONS) is still static demo content, deliberately not
 * rebuilt here. One entry per mentor with a pending recommendation for this
 * mentee (e.g. "Maria sent you 2 recommended learning materials"), newest
 * first; tapping it (see NotificationPanel.jsx's `to`) opens My Learning.
 * Swallows errors rather than throwing, so a Supabase hiccup only means
 * this one real entry is missing, not that the whole panel fails to open.
 */
async function getLearningRecommendationNotifications(menteeId) {
  if (!menteeId) return [];
  try {
    const groups = await getPendingRecommendationGroups(menteeId);
    return groups.map((group) => ({
      id: `learning-pending-${group.mentorId}`,
      type: "learning-recommendation",
      title: "New learning recommended",
      body: [
        { bold: true, text: group.mentorName },
        " sent you ",
        group.count === 1
          ? "a recommended learning material"
          : `${group.count} recommended learning materials`,
        ".",
      ],
      footer: "Tap to view in My Learning",
      to: "/my-learning",
    }));
  } catch {
    return [];
  }
}

// Static/mock content for the PoC — these examples are grounded in features
// that actually exist (Peer Connect connect/session requests, chat, and
// Community Voices recommended videos), but nothing here is triggered by
// real events yet. See PushNotification integration boundary above for what
// a live version would need.
const NOTIFICATIONS = [
  {
    id: "n1",
    type: "connect-accepted",
    title: "Connect request accepted",
    body: [
      "Your peer ",
      { bold: true, text: "Jo" },
      " has accepted your connect request!",
    ],
  },
  {
    id: "n2",
    type: "new-video",
    title: "New video added",
    body: [
      "A new video matching ",
      { bold: true, text: '"early childhood development"' },
      " was added to your Recommended feed.",
    ],
  },
  {
    id: "n3",
    type: "session-pending",
    title: "Session request pending",
    body: [
      "Your session request to ",
      { bold: true, text: "Jo" },
      " is awaiting a response.",
    ],
  },
  {
    id: "n4",
    type: "message-received",
    title: "Message received",
    body: ["You have a new message from ", { bold: true, text: "Jo" }, "."],
  },
];

/** `menteeId` is optional (mirrors AppState's currentUser.id) — without it this just returns the static demo list. */
export async function getNotifications(menteeId) {
  const learningNotifications =
    await getLearningRecommendationNotifications(menteeId);
  return [...learningNotifications, ...NOTIFICATIONS];
}
