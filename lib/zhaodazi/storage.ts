import { createInitialState } from "./mock-data";
import type { PrototypeState, PublishForm } from "./types";

export const STORAGE_KEY = "zhaodazi-v2-state-v4";
const PREVIOUS_KEY = "zhaodazi-v2-state-v3";
const LEGACY_KEY = "zhaodazi-v1-state-v2";
const PUBLISH_DRAFT_KEY = "zhaodazi-v2-publish-draft-v1";

export function loadPrototypeState(): PrototypeState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as PrototypeState;
      if (parsed.schemaVersion === 4 && Array.isArray(parsed.activities) && Array.isArray(parsed.participants)) return parsed;
    }

    const previous = localStorage.getItem(PREVIOUS_KEY);
    if (previous) {
      const parsed = JSON.parse(previous) as Omit<PrototypeState, "schemaVersion"> & { schemaVersion: number };
      if (parsed.schemaVersion === 3 && Array.isArray(parsed.activities) && Array.isArray(parsed.participants)) {
        const initial = createInitialState();
        const activityIds = new Set(parsed.activities.map((activity) => activity.id));
        const applicationIds = new Set(parsed.applications.map((application) => application.id));
        const participantIds = new Set(parsed.participants.map((participant) => `${participant.activityId}:${participant.userId}`));
        const behaviorIds = new Set(parsed.behaviors.map((behavior) => behavior.id));
        return {
          ...parsed,
          schemaVersion: 4,
          activities: [...parsed.activities, ...initial.activities.filter((activity) => !activityIds.has(activity.id))],
          applications: [...parsed.applications, ...initial.applications.filter((application) => !applicationIds.has(application.id))],
          participants: [...parsed.participants, ...initial.participants.filter((participant) => !participantIds.has(`${participant.activityId}:${participant.userId}`))],
          behaviors: [...parsed.behaviors, ...initial.behaviors.filter((behavior) => !behaviorIds.has(behavior.id))],
        };
      }
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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    const compactState: PrototypeState = {
      ...state,
      activities: state.activities.map((activity) => activity.photos?.length ? { ...activity, photos: undefined } : activity),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(compactState));
    } catch {
      // Keep the current in-memory state when browser storage is unavailable.
    }
  }
}

export function loadPublishDraft(): PublishForm | null {
  try {
    const saved = localStorage.getItem(PUBLISH_DRAFT_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved) as { version?: number; form?: Partial<PublishForm> };
    if (parsed.version !== 1 || !parsed.form) return null;
    const form = parsed.form;
    return {
      destinationIds: Array.isArray(form.destinationIds) ? form.destinationIds.filter((item): item is string => typeof item === "string").slice(0, 3) : [],
      startDate: typeof form.startDate === "string" ? form.startDate : "",
      endDate: typeof form.endDate === "string" ? form.endDate : "",
      flexibleDates: form.flexibleDates === true,
      photos: Array.isArray(form.photos) ? form.photos.filter((item): item is string => typeof item === "string" && item.startsWith("data:image/")).slice(0, 3) : [],
      description: typeof form.description === "string" ? form.description.slice(0, 500) : "",
      transport: ["步行", "自驾", "地铁", "打车", "公交"].includes(String(form.transport)) ? form.transport as PublishForm["transport"] : "",
      budgetLabel: ["免费", "50内", "50-100", "100+"].includes(String(form.budgetLabel)) ? form.budgetLabel as PublishForm["budgetLabel"] : "",
      meetingPoint: typeof form.meetingPoint === "string" ? form.meetingPoint.slice(0, 60) : "",
      notices: Array.isArray(form.notices) ? form.notices.filter((item): item is string => typeof item === "string").slice(0, 4) : [],
      extraNotes: typeof form.extraNotes === "string" ? form.extraNotes.slice(0, 200) : "",
      title: typeof form.title === "string" ? form.title : "",
    };
  } catch {
    return null;
  }
}

export function savePublishDraft(form: PublishForm) {
  const hasContent = Boolean(form.destinationIds.length || form.startDate || form.endDate || form.photos.length || form.description.trim() || form.transport || form.budgetLabel || form.meetingPoint.trim() || form.notices.length || form.extraNotes.trim());
  if (!hasContent) {
    clearPublishDraft();
    return;
  }
  try {
    localStorage.setItem(PUBLISH_DRAFT_KEY, JSON.stringify({ version: 1, form }));
  } catch {
    try {
      localStorage.setItem(PUBLISH_DRAFT_KEY, JSON.stringify({ version: 1, form: { ...form, photos: [] } }));
    } catch {
      // Draft remains available in memory for the current session.
    }
  }
}

export function clearPublishDraft() {
  localStorage.removeItem(PUBLISH_DRAFT_KEY);
}

export function clearPrototypeState() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PREVIOUS_KEY);
  localStorage.removeItem(LEGACY_KEY);
  localStorage.removeItem(PUBLISH_DRAFT_KEY);
}
