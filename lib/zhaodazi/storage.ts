import { createInitialState } from "./mock-data";
import type { PrototypeState } from "./types";

export const STORAGE_KEY = "zhaodazi-v2-state-v3";
const LEGACY_KEY = "zhaodazi-v1-state-v2";

export function loadPrototypeState(): PrototypeState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as PrototypeState;
      if (parsed.schemaVersion === 3 && Array.isArray(parsed.activities) && Array.isArray(parsed.participants)) return parsed;
    }

    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const parsed = JSON.parse(legacy) as { activities?: Array<Record<string, unknown>>; applications?: Array<Record<string, unknown>> };
      const initial = createInitialState();
      if (Array.isArray(parsed.activities)) {
        const legacyById = new Map(parsed.activities.map((item) => [String(item.id), item]));
        initial.activities = initial.activities.map((activity) => {
          const old = legacyById.get(activity.id);
          if (!old) return activity;
          const status = old.status === "ended" ? "completed" : old.status;
          return { ...activity, title: String(old.title ?? activity.title), description: String(old.description ?? activity.description), status: ["recruiting", "full", "completed", "cancelled"].includes(String(status)) ? status as PrototypeState["activities"][number]["status"] : activity.status };
        });
        const migratedFavorites = parsed.activities.filter((item) => item.favorite === true).map((item, index) => ({ id: `legacy-favorite-${index}`, userId: initial.currentUserId, activityId: String(item.id), behaviorType: "favorite" as const, createdAt: new Date().toISOString() }));
        initial.behaviors.push(...migratedFavorites);
      }
      if (Array.isArray(parsed.applications)) {
        const knownActivityIds = new Set(initial.activities.map((activity) => activity.id));
        const migrated = parsed.applications.filter((item) => knownActivityIds.has(String(item.activityId))).map((item, index) => {
          const legacyStatus = String(item.status ?? "pending");
          const status = legacyStatus === "withdrawn" ? "accepted" : ["pending", "accepted", "rejected"].includes(legacyStatus) ? legacyStatus as "pending" | "accepted" | "rejected" : "pending";
          return { id: String(item.id ?? `legacy-application-${index}`), activityId: String(item.activityId), userId: String(item.userId ?? initial.currentUserId), quickMessages: Array.isArray(item.quickMessages) ? item.quickMessages.map(String) : [], message: String(item.message ?? ""), status, createdAt: new Date().toISOString() };
        });
        initial.applications = migrated;
        migrated.filter((item) => item.status === "accepted").forEach((item) => {
          if (!initial.participants.some((participant) => participant.activityId === item.activityId && participant.userId === item.userId)) initial.participants.push({ activityId: item.activityId, userId: item.userId, status: "joined", joinedAt: item.createdAt });
        });
      }
      return initial;
    }
  } catch {
    // Fall through to a clean, versioned prototype state.
  }
  return createInitialState();
}

export function savePrototypeState(state: PrototypeState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearPrototypeState() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_KEY);
}
