import { openDB } from 'idb';

const DB_NAME = 'elevate-sync-queue';
const STORE_NAME = 'actions';

function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
    },
  });
}

export async function enqueueAction(action) {
  const db = await getDb();
  await db.add(STORE_NAME, { ...action, queuedAt: Date.now() });
}

export async function getQueuedActions() {
  const db = await getDb();
  return db.getAll(STORE_NAME);
}

export async function removeQueuedAction(id) {
  const db = await getDb();
  await db.delete(STORE_NAME, id);
}

/**
 * Replays queued actions through the provided handlers map ({ [type]: fn }).
 * A handler resolving successfully removes the action from the queue; a
 * throwing handler leaves it queued for the next reconnect.
 */
export async function flushQueue(handlers) {
  const actions = await getQueuedActions();
  for (const action of actions) {
    const handler = handlers[action.type];
    if (!handler) continue;
    try {
      await handler(action.payload);
      await removeQueuedAction(action.id);
    } catch {
      break;
    }
  }
}
