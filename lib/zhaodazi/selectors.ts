import type { Activity, ActivityStatus, MineTab, PrototypeState } from "./types";

const activeParticipantStatuses = new Set(["joined", "confirmed", "completed"]);

export function getActivityParticipants(state: PrototypeState, activityId: string) {
  return state.participants.filter((participant) => participant.activityId === activityId && activeParticipantStatuses.has(participant.status));
}

export function getParticipantCount(state: PrototypeState, activityId: string) {
  return getActivityParticipants(state, activityId).length;
}

export function getConfirmedCount(state: PrototypeState, activityId: string) {
  return state.participants.filter((participant) => participant.activityId === activityId && ["confirmed", "completed"].includes(participant.status)).length;
}

export function getUserParticipant(state: PrototypeState, activityId: string, userId = state.currentUserId) {
  return state.participants.find((participant) => participant.activityId === activityId && participant.userId === userId);
}

export function getUserApplication(state: PrototypeState, activityId: string, userId = state.currentUserId) {
  return state.applications.find((application) => application.activityId === activityId && application.userId === userId);
}

export function isFavorite(state: PrototypeState, activityId: string, userId = state.currentUserId) {
  const events = state.behaviors
    .filter((behavior) => behavior.userId === userId && behavior.activityId === activityId && ["favorite", "unfavorite"].includes(behavior.behaviorType))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return events.at(-1)?.behaviorType === "favorite";
}

export function getLocationPlanCount(state: PrototypeState, locationId: string) {
  return state.activities.filter((activity) => activity.locationId === locationId && ["recruiting", "full", "preparing"].includes(activity.status)).length;
}

export function getMineActivities(state: PrototypeState, tab: MineTab) {
  const userId = state.currentUserId;
  const participantByActivity = new Map(state.participants.filter((participant) => participant.userId === userId).map((participant) => [participant.activityId, participant]));
  const pendingIds = new Set(state.applications.filter((application) => application.userId === userId && application.status === "pending").map((application) => application.activityId));

  return state.activities.filter((activity) => {
    const participant = participantByActivity.get(activity.id);
    if (tab === "published") return activity.organizerId === userId;
    if (tab === "interested") return pendingIds.has(activity.id) && !["cancelled", "completed"].includes(activity.status);
    if (tab === "joined") return !!participant && ["joined", "confirmed"].includes(participant.status) && !["cancelled", "completed"].includes(activity.status);
    if (tab === "pendingConfirm") return participant?.status === "joined" && activity.status === "preparing";
    if (tab === "upcoming") return participant?.status === "confirmed" && activity.status === "preparing";
    if (tab === "favorites") return isFavorite(state, activity.id, userId);
    return activity.status === "completed" && participant?.status === "completed";
  });
}

export function effectiveActivityStatus(state: PrototypeState, activity: Activity): ActivityStatus {
  if (!["recruiting", "full"].includes(activity.status)) return activity.status;
  return getParticipantCount(state, activity.id) >= activity.capacity ? "full" : "recruiting";
}

export function eventStatusLabel(status: ActivityStatus) {
  return {
    draft: "草稿",
    recruiting: "招募中",
    full: "已满员",
    preparing: "准备出发",
    ongoing: "进行中",
    completed: "已结束",
    cancelled: "已取消",
  }[status];
}
