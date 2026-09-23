import type { Activity, ActivityStatus, Application, ParticipantStatus, PrototypeState, PublishForm, Role, UserPreference } from "./types";

type Action =
  | { type: "HYDRATE"; state: PrototypeState }
  | { type: "RESET"; state: PrototypeState }
  | { type: "SET_ROLE"; role: Role }
  | { type: "SAVE_PREFERENCE"; preference: UserPreference }
  | { type: "RECORD_VIEW"; activityId: string }
  | { type: "TOGGLE_FAVORITE"; activityId: string }
  | { type: "APPLY"; activityId: string; quickMessages: string[]; message: string }
  | { type: "ACCEPT_APPLICATION"; applicationId: string }
  | { type: "REJECT_APPLICATION"; applicationId: string }
  | { type: "WITHDRAW"; activityId: string }
  | { type: "CONFIRM_PARTICIPATION"; activityId: string }
  | { type: "SET_PARTICIPANT_STATUS"; activityId: string; status: ParticipantStatus | "none" }
  | { type: "SET_ACTIVITY_STATUS"; activityId: string; status: ActivityStatus }
  | { type: "CANCEL_ACTIVITY"; activityId: string }
  | { type: "ADD_DEBUG_APPLICATION"; activityId: string }
  | { type: "CLEAR_BEHAVIORS" }
  | { type: "PUBLISH_ACTIVITY"; form: PublishForm };

const now = () => new Date().toISOString();
const id = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

function addBehavior(state: PrototypeState, activityId: string, behaviorType: PrototypeState["behaviors"][number]["behaviorType"], userId = state.currentUserId) {
  return [...state.behaviors, { id: id("behavior"), userId, activityId, behaviorType, createdAt: now() }];
}

function dateForChoice(choice: string, customDate: string) {
  if (choice === "自定义") return customDate;
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  if (choice === "明天") date.setDate(date.getDate() + 1);
  if (choice === "本周末") {
    const daysUntilSaturday = (6 - date.getDay() + 7) % 7;
    date.setDate(date.getDate() + daysUntilSaturday);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function prototypeReducer(state: PrototypeState, action: Action): PrototypeState {
  if (action.type === "HYDRATE" || action.type === "RESET") return action.state;
  if (action.type === "SET_ROLE") return { ...state, debugRole: action.role, currentUserId: action.role === "participant" ? "participant-demo" : "organizer-demo" };
  if (action.type === "SAVE_PREFERENCE") return { ...state, preferences: [...state.preferences.filter((item) => item.userId !== action.preference.userId), action.preference] };

  if (action.type === "RECORD_VIEW") {
    const last = state.behaviors.filter((item) => item.userId === state.currentUserId && item.activityId === action.activityId && item.behaviorType === "view").at(-1);
    if (last && Date.now() - new Date(last.createdAt).getTime() < 60_000) return state;
    return { ...state, behaviors: addBehavior(state, action.activityId, "view") };
  }

  if (action.type === "TOGGLE_FAVORITE") {
    const favoriteEvents = state.behaviors.filter((item) => item.userId === state.currentUserId && item.activityId === action.activityId && ["favorite", "unfavorite"].includes(item.behaviorType));
    const isFavorite = favoriteEvents.at(-1)?.behaviorType === "favorite";
    return { ...state, behaviors: addBehavior(state, action.activityId, isFavorite ? "unfavorite" : "favorite") };
  }

  if (action.type === "APPLY") {
    const existing = state.applications.find((item) => item.activityId === action.activityId && item.userId === state.currentUserId);
    const nextApplication: Application = existing
      ? { ...existing, quickMessages: action.quickMessages, message: action.message, status: "pending", createdAt: now(), handledAt: undefined }
      : { id: id("application"), activityId: action.activityId, userId: state.currentUserId, quickMessages: action.quickMessages, message: action.message, status: "pending", createdAt: now() };
    return {
      ...state,
      applications: existing ? state.applications.map((item) => item.id === existing.id ? nextApplication : item) : [...state.applications, nextApplication],
      behaviors: addBehavior(state, action.activityId, "apply"),
    };
  }

  if (action.type === "ACCEPT_APPLICATION") {
    const application = state.applications.find((item) => item.id === action.applicationId);
    if (!application || application.status !== "pending") return state;
    const activity = state.activities.find((item) => item.id === application.activityId);
    const participantCount = state.participants.filter((item) => item.activityId === application.activityId && ["joined", "confirmed", "completed"].includes(item.status)).length;
    if (!activity || activity.status !== "recruiting" || participantCount >= activity.capacity) return state;
    const exists = state.participants.some((item) => item.activityId === application.activityId && item.userId === application.userId);
    return {
      ...state,
      activities: state.activities.map((item) => item.id === activity.id ? { ...item, status: "preparing" } : item),
      applications: state.applications.map((item) => item.id === application.id ? { ...item, status: "accepted", handledAt: now() } : item.activityId === activity.id && item.status === "pending" ? { ...item, status: "cancelled", handledAt: now() } : item),
      participants: exists
        ? state.participants.map((item) => item.activityId === application.activityId && item.userId === application.userId ? { ...item, status: "joined", joinedAt: now(), withdrawnAt: undefined } : item)
        : [...state.participants, { activityId: application.activityId, userId: application.userId, status: "joined", joinedAt: now() }],
      behaviors: addBehavior(state, application.activityId, "join", application.userId),
    };
  }

  if (action.type === "REJECT_APPLICATION") return { ...state, applications: state.applications.map((item) => item.id === action.applicationId ? { ...item, status: "rejected", handledAt: now() } : item) };

  if (action.type === "WITHDRAW") {
    return {
      ...state,
      activities: state.activities.map((item) => item.id === action.activityId && item.status === "full" ? { ...item, status: "recruiting" } : item),
      participants: state.participants.map((item) => item.activityId === action.activityId && item.userId === state.currentUserId ? { ...item, status: "withdrawn", withdrawnAt: now() } : item),
      behaviors: addBehavior(state, action.activityId, "cancel"),
    };
  }

  if (action.type === "CONFIRM_PARTICIPATION") {
    return { ...state, participants: state.participants.map((item) => item.activityId === action.activityId && item.userId === state.currentUserId && item.status === "joined" ? { ...item, status: "confirmed", confirmedAt: now() } : item) };
  }

  if (action.type === "SET_PARTICIPANT_STATUS") {
    const exists = state.participants.some((item) => item.activityId === action.activityId && item.userId === state.currentUserId);
    if (action.status === "none") return { ...state, participants: state.participants.filter((item) => !(item.activityId === action.activityId && item.userId === state.currentUserId)) };
    const nextStatus: ParticipantStatus = action.status;
    if (exists) return { ...state, participants: state.participants.map((item) => item.activityId === action.activityId && item.userId === state.currentUserId ? { ...item, status: nextStatus } : item) };
    return { ...state, participants: [...state.participants, { activityId: action.activityId, userId: state.currentUserId, status: nextStatus, joinedAt: now() }] };
  }

  if (action.type === "SET_ACTIVITY_STATUS") {
    const activity = state.activities.find((item) => item.id === action.activityId);
    if (!activity) return state;
    let participants = state.participants;
    if (action.status === "recruiting") participants = participants.filter((item) => !(item.activityId === activity.id && item.isDebug));
    if (action.status === "full") {
      const activeIds = new Set(participants.filter((item) => item.activityId === activity.id && ["joined", "confirmed", "completed"].includes(item.status)).map((item) => item.userId));
      const needed = Math.max(0, activity.capacity - activeIds.size);
      const additions = state.users.filter((user) => !activeIds.has(user.id)).slice(0, needed).map((user) => ({ activityId: activity.id, userId: user.id, status: "confirmed" as const, joinedAt: now(), confirmedAt: now(), isDebug: true }));
      participants = [...participants, ...additions];
    }
    if (action.status === "completed") participants = participants.map((item) => item.activityId === activity.id && ["joined", "confirmed"].includes(item.status) ? { ...item, status: "completed", completedAt: now() } : item);
    const completedUsers = action.status === "completed" ? participants.filter((item) => item.activityId === activity.id && item.status === "completed") : [];
    return { ...state, activities: state.activities.map((item) => item.id === activity.id ? { ...item, status: action.status } : item), participants, behaviors: completedUsers.reduce((items, item) => addBehavior({ ...state, behaviors: items }, activity.id, "complete", item.userId), state.behaviors) };
  }
  if (action.type === "CANCEL_ACTIVITY") return {
    ...state,
    activities: state.activities.map((item) => item.id === action.activityId ? { ...item, status: "cancelled" } : item),
    applications: state.applications.map((item) => item.activityId === action.activityId && item.status === "pending" ? { ...item, status: "cancelled", handledAt: now() } : item),
  };

  if (action.type === "ADD_DEBUG_APPLICATION") {
    const activity = state.activities.find((item) => item.id === action.activityId);
    if (!activity || activity.status !== "recruiting") return state;
    const unavailable = new Set([...state.applications.filter((item) => item.activityId === activity.id).map((item) => item.userId), ...state.participants.filter((item) => item.activityId === activity.id).map((item) => item.userId), activity.organizerId]);
    const applicant = state.users.find((user) => !unavailable.has(user.id));
    if (!applicant) return state;
    return { ...state, applications: [...state.applications, { id: id("application"), activityId: activity.id, userId: applicant.id, quickMessages: ["时间刚好合适"], message: "Debug 模拟申请：时间合适，可以一起出发。", status: "pending", createdAt: now() }] };
  }

  if (action.type === "CLEAR_BEHAVIORS") return { ...state, behaviors: state.behaviors.filter((item) => item.userId !== state.currentUserId) };

  if (action.type === "PUBLISH_ACTIVITY") {
    const location = state.locations.find((item) => item.id === action.form.locationId)!;
    const activityId = id("created");
    const activity: Activity = {
      id: activityId,
      title: action.form.title.trim(),
      locationId: action.form.locationId,
      date: dateForChoice(action.form.when, action.form.customDate),
      dateLabel: action.form.when === "自定义" ? action.form.customDate : action.form.when === "本周末" ? "本周六" : action.form.when,
      startTime: "14:00",
      endTime: "20:00",
      category: action.form.category,
      intensity: action.form.intensity,
      socialStyle: action.form.socialStyle || undefined,
      photoStyle: action.form.photoStyle || undefined,
      spendingStyle: action.form.spendingStyle || undefined,
      budgetMin: 0,
      budgetMax: 100,
      capacity: 1 + Number(action.form.people.replace("+", "")),
      organizerId: state.currentUserId,
      description: action.form.description.trim(),
      tags: [action.form.category, action.form.socialStyle, action.form.photoStyle].filter(Boolean) as string[],
      status: "recruiting",
      createdAt: now(),
    };
    return {
      ...state,
      activities: [...state.activities, activity],
      participants: [...state.participants, { activityId, userId: state.currentUserId, status: "confirmed", joinedAt: now(), confirmedAt: now() }],
    };
  }

  return state;
}
