import { getParticipantCount } from "./selectors";
import type { Activity, PrototypeState, UserPreference } from "./types";

export type Recommendation = {
  activity: Activity;
  score: number;
  reasons: string[];
};

function matchesAvailableTime(activity: Activity, preference: UserPreference) {
  const labels = new Set(preference.availableTimes);
  if (labels.has("周末") && ["本周六", "本周日"].includes(activity.dateLabel)) return true;
  if (labels.has("周六") && activity.dateLabel.includes("周六")) return true;
  if (labels.has("周日") && activity.dateLabel.includes("周日")) return true;
  if (labels.has("节假日") && activity.dateLabel.includes("假期")) return true;
  if (labels.has("工作日晚上") && !activity.dateLabel.includes("周六") && !activity.dateLabel.includes("周日") && Number(activity.startTime.slice(0, 2)) >= 18) return true;
  return false;
}

function distanceLimit(preference: UserPreference) {
  return { "附近": 15, "50km 内": 50, "100km 内": 100, "周边城市": 150, "都可以": Infinity }[preference.distancePreference];
}

export function getRecommendations(state: PrototypeState): Recommendation[] {
  const preference = state.preferences.find((item) => item.userId === state.currentUserId);
  if (!preference) return [];

  const recentCategoryIds = new Set(
    state.behaviors
      .filter((behavior) => behavior.userId === state.currentUserId && Date.now() - new Date(behavior.createdAt).getTime() <= 30 * 24 * 60 * 60 * 1000 && ["view", "favorite", "apply", "join", "complete"].includes(behavior.behaviorType))
      .map((behavior) => state.activities.find((activity) => activity.id === behavior.activityId)?.category)
      .filter(Boolean),
  );

  return state.activities
    .filter((activity) => {
      const location = state.locations.find((item) => item.id === activity.locationId);
      return activity.organizerId !== state.currentUserId
        && ["recruiting", "full"].includes(activity.status)
        && getParticipantCount(state, activity.id) < activity.capacity;
    })
    .map((activity) => {
      let score = 0;
      const reasons: string[] = [];
      if (preference.categories.includes(activity.category)) { score += 30; reasons.push(`你喜欢${activity.category}`); }
      if (matchesAvailableTime(activity, preference)) { score += 25; reasons.push(`${activity.dateLabel}符合你的时间偏好`); }
      if (preference.intensityPreference === activity.intensity) { score += 20; reasons.push(`${activity.intensity}节奏符合你的出游习惯`); }
      if (preference.socialPreference === activity.socialStyle) { score += 15; reasons.push(`${activity.socialStyle}符合你的社交偏好`); }
      if (recentCategoryIds.has(activity.category)) { score += 10; reasons.push(`你最近常看${activity.category}活动`); }
      return { activity, score, reasons: [...new Set(reasons)].slice(0, 3), distanceFit: (state.locations.find((item) => item.id === activity.locationId)?.distanceKm ?? Infinity) <= distanceLimit(preference) };
    })
    .sort((a, b) => b.score - a.score || Number(b.distanceFit) - Number(a.distanceFit) || a.activity.date.localeCompare(b.activity.date))
    .map(({ activity, score, reasons }) => ({ activity, score, reasons }));
}
