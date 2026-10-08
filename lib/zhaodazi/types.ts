export type Page =
  | "discover"
  | "list"
  | "detail"
  | "publish"
  | "applications"
  | "success"
  | "mine"
  | "preference"
  | "profile"
  | "preparation";

export type Role = "participant" | "organizer";
export type LocationId = "wutong" | "dapeng" | "shenzhen-bay" | "shuangyue-bay" | "futian";
export type ActivityCategory = "徒步" | "海边" | "露营" | "Citywalk" | "骑行" | "自驾" | "看展" | "滑雪" | "短途旅行";
export type Intensity = "轻松" | "正常" | "特种兵";
export type SocialStyle = "各玩各的" | "随缘聊天" | "热闹一点";
export type PhotoStyle = "不太拍" | "随手拍" | "喜欢拍照";
export type SpendingStyle = "省钱优先" | "正常消费" | "体验优先";
export type TransportMode = "步行" | "自驾" | "地铁" | "打车" | "公交";
export type BudgetLabel = "免费" | "50内" | "50-100" | "100+";
export type ActivityStatus = "draft" | "recruiting" | "full" | "preparing" | "ongoing" | "completed" | "cancelled";
export type ApplicationStatus = "pending" | "accepted" | "rejected" | "cancelled";
export type ParticipantStatus = "joined" | "confirmed" | "withdrawn" | "completed";
export type BehaviorType = "view" | "favorite" | "unfavorite" | "apply" | "join" | "cancel" | "complete";
export type AvailableTime = "工作日晚上" | "周六" | "周日" | "周末" | "节假日";
export type DistancePreference = "附近" | "50km 内" | "100km 内" | "周边城市" | "都可以";
export type MineTab = "published" | "interested" | "joined" | "pendingConfirm" | "upcoming" | "favorites" | "history";

export type User = {
  id: string;
  name: string;
  avatar: string;
  tone: "blue" | "pink" | "green" | "amber";
  age: number;
  city: string;
  verifiedWechat: boolean;
  verifiedPhone: boolean;
  verifiedIdentity: boolean;
  joinedCount: number;
  organizedCount: number;
  completedCount: number;
  fulfillmentRate: number;
  recentCancellationCount: number;
  commonCategories: ActivityCategory[];
  preferredIntensity: Intensity;
  preferredSocialStyle: SocialStyle;
  impressionTags: string[];
};

export type UserPreference = {
  userId: string;
  categories: ActivityCategory[];
  availableTimes: AvailableTime[];
  distancePreference: DistancePreference;
  intensityPreference: Intensity;
  socialPreference: SocialStyle;
  updatedAt: string;
};

export type Location = {
  id: LocationId;
  name: string;
  district: string;
  distanceKm: number;
  categoryHint: string;
  markerClass: string;
};

export type Activity = {
  id: string;
  title: string;
  locationId: LocationId;
  date: string;
  dateLabel: string;
  startTime: string;
  endTime: string;
  category: ActivityCategory;
  intensity: Intensity;
  socialStyle?: SocialStyle;
  photoStyle?: PhotoStyle;
  spendingStyle?: SpendingStyle;
  budgetMin: number;
  budgetMax: number;
  capacity: number;
  organizerId: string;
  description: string;
  tags: string[];
  status: ActivityStatus;
  createdAt: string;
  routeStops?: string[];
  endDate?: string;
  photos?: string[];
  transport?: TransportMode;
  budgetLabel?: BudgetLabel;
  meetingPoint?: string;
  notices?: string[];
  extraNotes?: string;
  flexibleDates?: boolean;
};

export type Application = {
  id: string;
  activityId: string;
  userId: string;
  quickMessages: string[];
  message: string;
  status: ApplicationStatus;
  createdAt: string;
  handledAt?: string;
};

export type Participant = {
  activityId: string;
  userId: string;
  status: ParticipantStatus;
  joinedAt: string;
  confirmedAt?: string;
  withdrawnAt?: string;
  completedAt?: string;
  isDebug?: boolean;
};

export type UserActivityBehavior = {
  id: string;
  userId: string;
  activityId: string;
  behaviorType: BehaviorType;
  createdAt: string;
};

export type Review = {
  id: string;
  activityId: string;
  fromUserId: string;
  toUserId: string;
  positiveTags: string[];
  issueType?: "临时放鸽子" | "与描述不符" | "推销" | "骚扰" | "危险行为" | "其他";
  createdAt: string;
};

export type PrototypeState = {
  schemaVersion: 4;
  currentUserId: string;
  debugRole: Role;
  users: User[];
  preferences: UserPreference[];
  locations: Location[];
  activities: Activity[];
  applications: Application[];
  participants: Participant[];
  behaviors: UserActivityBehavior[];
  reviews: Review[];
};

export type PublishForm = {
  destinationIds: string[];
  startDate: string;
  endDate: string;
  flexibleDates: boolean;
  photos: string[];
  description: string;
  transport: TransportMode | "";
  budgetLabel: BudgetLabel | "";
  meetingPoint: string;
  notices: string[];
  extraNotes: string;
  title: string;
};
