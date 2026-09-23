import type { Activity, Application, Location, Participant, PrototypeState, User } from "./types";

export const CURRENT_USER_ID = "participant-demo";
export const ORGANIZER_USER_ID = "organizer-demo";

export const locations: Location[] = [
  { id: "wutong", name: "梧桐山", district: "深圳 · 罗湖", distanceKm: 18, categoryHint: "徒步热门", markerClass: "marker-wutong" },
  { id: "dapeng", name: "大鹏", district: "深圳 · 大鹏新区", distanceKm: 49, categoryHint: "海边", markerClass: "marker-dapeng" },
  { id: "shenzhen-bay", name: "深圳湾", district: "深圳 · 南山", distanceKm: 8, categoryHint: "骑行", markerClass: "marker-bay" },
  { id: "shuangyue-bay", name: "双月湾", district: "惠州 · 惠东", distanceKm: 118, categoryHint: "露营", markerClass: "marker-huizhou" },
  { id: "futian", name: "福田中心区", district: "深圳 · 福田", distanceKm: 5, categoryHint: "Citywalk", markerClass: "marker-futian" },
];

const users: User[] = [
  { id: CURRENT_USER_ID, name: "小安", avatar: "安", tone: "pink", age: 24, city: "深圳", verifiedWechat: true, verifiedPhone: true, verifiedIdentity: false, joinedCount: 6, organizedCount: 0, completedCount: 5, fulfillmentRate: 100, recentCancellationCount: 0, commonCategories: ["徒步", "海边", "Citywalk"], preferredIntensity: "正常", preferredSocialStyle: "随缘聊天", impressionTags: ["准时", "好沟通", "会拍照"] },
  { id: ORGANIZER_USER_ID, name: "小宇", avatar: "宇", tone: "blue", age: 27, city: "深圳", verifiedWechat: true, verifiedPhone: true, verifiedIdentity: true, joinedCount: 8, organizedCount: 3, completedCount: 7, fulfillmentRate: 94, recentCancellationCount: 1, commonCategories: ["徒步", "海边", "骑行"], preferredIntensity: "正常", preferredSocialStyle: "随缘聊天", impressionTags: ["准时", "好沟通", "行程靠谱"] },
  { id: "lin", name: "阿林", avatar: "林", tone: "green", age: 26, city: "深圳", verifiedWechat: true, verifiedPhone: true, verifiedIdentity: true, joinedCount: 10, organizedCount: 1, completedCount: 9, fulfillmentRate: 96, recentCancellationCount: 0, commonCategories: ["徒步", "露营"], preferredIntensity: "正常", preferredSocialStyle: "随缘聊天", impressionTags: ["好相处", "行程靠谱"] },
  { id: "cheng", name: "阿诚", avatar: "诚", tone: "green", age: 27, city: "深圳", verifiedWechat: true, verifiedPhone: true, verifiedIdentity: false, joinedCount: 12, organizedCount: 0, completedCount: 11, fulfillmentRate: 92, recentCancellationCount: 1, commonCategories: ["徒步", "骑行"], preferredIntensity: "正常", preferredSocialStyle: "热闹一点", impressionTags: ["准时", "会照顾人"] },
  { id: "jiajia", name: "嘉嘉", avatar: "嘉", tone: "amber", age: 25, city: "深圳", verifiedWechat: true, verifiedPhone: true, verifiedIdentity: true, joinedCount: 2, organizedCount: 1, completedCount: 2, fulfillmentRate: 100, recentCancellationCount: 0, commonCategories: ["海边", "Citywalk", "看展"], preferredIntensity: "轻松", preferredSocialStyle: "随缘聊天", impressionTags: ["好沟通", "会拍照"] },
  { id: "bei", name: "小贝", avatar: "贝", tone: "pink", age: 23, city: "深圳", verifiedWechat: true, verifiedPhone: true, verifiedIdentity: false, joinedCount: 4, organizedCount: 0, completedCount: 4, fulfillmentRate: 100, recentCancellationCount: 0, commonCategories: ["露营", "海边"], preferredIntensity: "轻松", preferredSocialStyle: "热闹一点", impressionTags: ["准时", "气氛担当"] },
];

const baseActivities: Omit<Activity, "createdAt">[] = [
  { id: "wutong-sunset", title: "周六一起去梧桐山看日落", locationId: "wutong", date: "2026-09-26", dateLabel: "本周六", startTime: "14:00", endTime: "20:00", category: "徒步", intensity: "正常", socialStyle: "随缘聊天", photoStyle: "喜欢拍照", spendingStyle: "正常消费", budgetMin: 50, budgetMax: 100, capacity: 5, organizerId: ORGANIZER_USER_ID, description: "下午上山，在山顶看看日落，再慢慢下来。不赶时间，主要想拍照和聊天。", tags: ["日落", "拍照", "不赶行程"], status: "recruiting" },
  { id: "wutong-morning", title: "周日早起梧桐山轻徒步", locationId: "wutong", date: "2026-09-27", dateLabel: "本周日", startTime: "08:30", endTime: "13:00", category: "徒步", intensity: "轻松", socialStyle: "随缘聊天", photoStyle: "随手拍", spendingStyle: "省钱优先", budgetMin: 30, budgetMax: 60, capacity: 4, organizerId: "lin", description: "走走停停，新手友好，中午前下山。", tags: ["新手友好", "早起局"], status: "recruiting" },
  { id: "wutong-photo", title: "梧桐山植物园拍照搭子", locationId: "wutong", date: "2026-09-24", dateLabel: "明天", startTime: "15:30", endTime: "18:30", category: "Citywalk", intensity: "轻松", socialStyle: "随缘聊天", photoStyle: "喜欢拍照", spendingStyle: "省钱优先", budgetMin: 0, budgetMax: 50, capacity: 3, organizerId: "jiajia", description: "想拍秋天的植物，互相帮忙出片。", tags: ["拍照", "慢节奏", "女生友好"], status: "full" },
  { id: "dapeng-seaside", title: "周日下午大鹏海边散步", locationId: "dapeng", date: "2026-09-27", dateLabel: "本周日", startTime: "15:00", endTime: "20:00", category: "海边", intensity: "轻松", socialStyle: "随缘聊天", photoStyle: "喜欢拍照", spendingStyle: "正常消费", budgetMin: 80, budgetMax: 150, capacity: 4, organizerId: "jiajia", description: "海边走走、看日落，找两位不赶时间的搭子。", tags: ["日落", "慢节奏"], status: "recruiting" },
  { id: "dapeng-drive", title: "明早自驾去大鹏看海", locationId: "dapeng", date: "2026-09-24", dateLabel: "明天", startTime: "09:00", endTime: "17:00", category: "自驾", intensity: "正常", socialStyle: "热闹一点", photoStyle: "随手拍", spendingStyle: "正常消费", budgetMin: 150, budgetMax: 250, capacity: 4, organizerId: "cheng", description: "福田出发，油费路费 AA，希望大家守时。", tags: ["自驾", "守时", "AA"], status: "recruiting" },
  { id: "bay-cycle", title: "深圳湾傍晚骑行", locationId: "shenzhen-bay", date: "2026-09-23", dateLabel: "今天", startTime: "18:30", endTime: "21:00", category: "骑行", intensity: "正常", socialStyle: "随缘聊天", photoStyle: "随手拍", spendingStyle: "省钱优先", budgetMin: 0, budgetMax: 50, capacity: 5, organizerId: "lin", description: "沿海岸线轻松骑一圈，中途会停下来拍照。", tags: ["夜景", "下班后"], status: "recruiting" },
  { id: "shuangyue-camp", title: "双月湾周末露营看星星", locationId: "shuangyue-bay", date: "2026-09-26", dateLabel: "本周六", startTime: "13:00", endTime: "次日10:00", category: "露营", intensity: "轻松", socialStyle: "热闹一点", photoStyle: "喜欢拍照", spendingStyle: "体验优先", budgetMin: 200, budgetMax: 300, capacity: 6, organizerId: "cheng", description: "装备基本齐全，再找两位会做饭或会拍照的朋友。", tags: ["看星星", "过夜"], status: "recruiting" },
  { id: "futian-citywalk", title: "周六福田建筑 Citywalk", locationId: "futian", date: "2026-09-26", dateLabel: "本周六", startTime: "10:00", endTime: "16:00", category: "Citywalk", intensity: "正常", socialStyle: "随缘聊天", photoStyle: "喜欢拍照", spendingStyle: "正常消费", budgetMin: 60, budgetMax: 120, capacity: 5, organizerId: "jiajia", description: "看几个有意思的建筑，中间找家咖啡店休息。", tags: ["建筑", "咖啡", "拍照"], status: "recruiting" },
  { id: "futian-exhibition", title: "当代艺术展看展搭子", locationId: "futian", date: "2026-09-27", dateLabel: "本周日", startTime: "14:00", endTime: "17:00", category: "看展", intensity: "轻松", socialStyle: "各玩各的", photoStyle: "不太拍", spendingStyle: "正常消费", budgetMin: 80, budgetMax: 120, capacity: 3, organizerId: "lin", description: "不需要一直聊天，看完可以一起吃饭交流。", tags: ["艺术", "安静", "室内"], status: "recruiting" },
  { id: "bay-nightwalk", title: "工作日晚深圳湾散步", locationId: "shenzhen-bay", date: "2026-09-25", dateLabel: "周五", startTime: "19:30", endTime: "21:30", category: "Citywalk", intensity: "轻松", socialStyle: "随缘聊天", photoStyle: "随手拍", spendingStyle: "省钱优先", budgetMin: 0, budgetMax: 30, capacity: 4, organizerId: ORGANIZER_USER_ID, description: "下班后吹吹海风，走累了就结束。", tags: ["夜景", "下班后", "轻松"], status: "preparing" },
  { id: "dapeng-coast-hike", title: "大鹏海岸线轻徒步", locationId: "dapeng", date: "2026-10-01", dateLabel: "国庆假期", startTime: "09:00", endTime: "17:30", category: "短途旅行", intensity: "正常", socialStyle: "热闹一点", photoStyle: "喜欢拍照", spendingStyle: "体验优先", budgetMin: 180, budgetMax: 280, capacity: 6, organizerId: "cheng", description: "海岸线徒步加看海，一天往返。", tags: ["海岸线", "假期", "一天往返"], status: "recruiting" },
  { id: "wutong-fast", title: "梧桐山速登挑战", locationId: "wutong", date: "2026-09-27", dateLabel: "本周日", startTime: "06:30", endTime: "11:00", category: "徒步", intensity: "特种兵", socialStyle: "各玩各的", photoStyle: "不太拍", spendingStyle: "省钱优先", budgetMin: 20, budgetMax: 50, capacity: 4, organizerId: "cheng", description: "有一定体能基础再来，按计划快速登顶。", tags: ["速登", "体能局"], status: "recruiting" },
];

const activities: Activity[] = baseActivities.map((activity, index) => ({ ...activity, createdAt: `2026-09-${String(10 + index).padStart(2, "0")}T10:00:00+08:00` }));

const participants: Participant[] = [
  { activityId: "wutong-sunset", userId: ORGANIZER_USER_ID, status: "confirmed", joinedAt: "2026-09-10T10:00:00+08:00", confirmedAt: "2026-09-10T10:00:00+08:00" },
  { activityId: "wutong-sunset", userId: "lin", status: "confirmed", joinedAt: "2026-09-13T10:00:00+08:00", confirmedAt: "2026-09-20T10:00:00+08:00" },
  { activityId: "wutong-sunset", userId: "jiajia", status: "joined", joinedAt: "2026-09-18T10:00:00+08:00" },
  { activityId: "bay-nightwalk", userId: ORGANIZER_USER_ID, status: "confirmed", joinedAt: "2026-09-10T10:00:00+08:00", confirmedAt: "2026-09-10T10:00:00+08:00" },
  { activityId: "bay-nightwalk", userId: CURRENT_USER_ID, status: "joined", joinedAt: "2026-09-21T10:00:00+08:00" },
  ...activities.filter((activity) => !["wutong-sunset", "bay-nightwalk"].includes(activity.id)).flatMap((activity) => [
    { activityId: activity.id, userId: activity.organizerId, status: "confirmed" as const, joinedAt: activity.createdAt, confirmedAt: activity.createdAt },
    ...(activity.status === "full" ? [{ activityId: activity.id, userId: "lin", status: "confirmed" as const, joinedAt: activity.createdAt, confirmedAt: activity.createdAt }, { activityId: activity.id, userId: "cheng", status: "joined" as const, joinedAt: activity.createdAt }] : []),
  ]),
];

const applications: Application[] = [
  { id: "app-cheng", activityId: "wutong-sunset", userId: "cheng", quickMessages: ["之前参加过类似活动"], message: "周末有空，平时经常徒步。", status: "pending", createdAt: "2026-09-22T10:00:00+08:00" },
  { id: "app-demo-preparing", activityId: "bay-nightwalk", userId: CURRENT_USER_ID, quickMessages: ["时间刚好合适"], message: "下班后可以直接过去。", status: "accepted", createdAt: "2026-09-21T10:00:00+08:00", handledAt: "2026-09-21T12:00:00+08:00" },
];

export function createInitialState(): PrototypeState {
  return {
    schemaVersion: 3,
    currentUserId: CURRENT_USER_ID,
    debugRole: "participant",
    users: structuredClone(users),
    preferences: [
      { userId: CURRENT_USER_ID, categories: ["徒步", "海边"], availableTimes: ["周末", "周六", "周日"], distancePreference: "50km 内", intensityPreference: "正常", socialPreference: "随缘聊天", updatedAt: "2026-09-23T09:00:00+08:00" },
      { userId: ORGANIZER_USER_ID, categories: ["骑行", "海边", "徒步"], availableTimes: ["周末", "工作日晚上"], distancePreference: "100km 内", intensityPreference: "正常", socialPreference: "随缘聊天", updatedAt: "2026-09-23T09:00:00+08:00" },
    ],
    locations: structuredClone(locations),
    activities: structuredClone(activities),
    applications: structuredClone(applications),
    participants: structuredClone(participants),
    behaviors: [
      { id: "behavior-1", userId: CURRENT_USER_ID, activityId: "wutong-morning", behaviorType: "view", createdAt: "2026-09-22T12:00:00+08:00" },
      { id: "behavior-2", userId: CURRENT_USER_ID, activityId: "dapeng-seaside", behaviorType: "favorite", createdAt: "2026-09-22T14:00:00+08:00" },
      { id: "behavior-3", userId: CURRENT_USER_ID, activityId: "bay-nightwalk", behaviorType: "join", createdAt: "2026-09-21T12:00:00+08:00" },
    ],
    reviews: [],
  };
}
