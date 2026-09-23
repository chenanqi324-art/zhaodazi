"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
  Bookmark,
  Bug,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  Compass,
  Footprints,
  MapPin,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Page = "discover" | "list" | "detail" | "publish" | "applications" | "success" | "mine";
type Role = "participant" | "organizer";
type EventStatus = "recruiting" | "full" | "cancelled" | "ended";
type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";
type Relation = "none" | ApplicationStatus;
type LocationId = "wutong" | "dapeng" | "shenzhen-bay" | "shuangyue-bay";
type MineTab = "published" | "interested" | "joined" | "favorites" | "history";

type Activity = {
  id: string;
  title: string;
  locationId: LocationId;
  location: string;
  date: string;
  time: string;
  category: string;
  intensity: string;
  budget: string;
  description: string;
  current: number;
  capacity: number;
  tags: string[];
  status: EventStatus;
  favorite: boolean;
  organizerId: string;
};

type Application = {
  id: string;
  activityId: string;
  userId: string;
  name: string;
  age: number;
  joinedCount: number;
  rate: string;
  message: string;
  quickMessages: string[];
  tone: "pink" | "green" | "amber";
  status: ApplicationStatus;
};

const locations: Record<LocationId, { name: string; district: string; planCount: number; markerClass: string }> = {
  wutong: { name: "梧桐山", district: "深圳 · 罗湖", planCount: 8, markerClass: "marker-wutong" },
  dapeng: { name: "大鹏", district: "深圳 · 大鹏新区", planCount: 12, markerClass: "marker-dapeng" },
  "shenzhen-bay": { name: "深圳湾", district: "深圳 · 南山", planCount: 5, markerClass: "marker-bay" },
  "shuangyue-bay": { name: "双月湾", district: "惠州 · 惠东", planCount: 6, markerClass: "marker-huizhou" },
};

const initialActivities: Activity[] = [
  {
    id: "wutong-sunset",
    title: "周六一起去梧桐山看日落",
    locationId: "wutong",
    location: "深圳 · 梧桐山",
    date: "本周六",
    time: "14:00–20:00",
    category: "徒步",
    intensity: "正常",
    budget: "50–100 元",
    description: "下午上山，在山顶看看日落，再慢慢下来。不赶时间，主要想拍照和聊天。",
    current: 3,
    capacity: 5,
    tags: ["正常强度", "会拍照", "随缘聊天", "不赶行程"],
    status: "recruiting",
    favorite: false,
    organizerId: "organizer-demo",
  },
  {
    id: "wutong-morning",
    title: "周日早起梧桐山轻徒步",
    locationId: "wutong",
    location: "深圳 · 梧桐山",
    date: "本周日",
    time: "08:30–13:00",
    category: "徒步",
    intensity: "轻松",
    budget: "30–60 元",
    description: "走走停停，新手友好，中午前下山。",
    current: 2,
    capacity: 4,
    tags: ["新手友好", "轻松", "早起局"],
    status: "recruiting",
    favorite: false,
    organizerId: "other-user",
  },
  {
    id: "wutong-photo",
    title: "梧桐山植物园拍照搭子",
    locationId: "wutong",
    location: "深圳 · 梧桐山",
    date: "今天",
    time: "15:30–18:30",
    category: "拍照",
    intensity: "轻松",
    budget: "0–50 元",
    description: "想拍秋天的植物，互相帮忙出片。",
    current: 3,
    capacity: 3,
    tags: ["拍照", "慢节奏", "女生局"],
    status: "full",
    favorite: false,
    organizerId: "other-user",
  },
  {
    id: "dapeng-seaside",
    title: "周日下午大鹏海边散步",
    locationId: "dapeng",
    location: "深圳 · 大鹏",
    date: "本周日",
    time: "15:00–20:00",
    category: "海边",
    intensity: "轻松",
    budget: "80–150 元",
    description: "海边走走、看日落，找两位不赶时间的搭子。",
    current: 2,
    capacity: 4,
    tags: ["海边", "日落", "慢节奏"],
    status: "recruiting",
    favorite: false,
    organizerId: "other-user",
  },
  {
    id: "dapeng-drive",
    title: "明早自驾去大鹏看海",
    locationId: "dapeng",
    location: "深圳 · 大鹏",
    date: "明天",
    time: "09:00–17:00",
    category: "自驾",
    intensity: "正常",
    budget: "150–250 元",
    description: "福田出发，油费路费 AA，希望大家守时。",
    current: 3,
    capacity: 4,
    tags: ["自驾", "守时", "AA"],
    status: "recruiting",
    favorite: false,
    organizerId: "other-user",
  },
  {
    id: "bay-cycle",
    title: "深圳湾傍晚骑行",
    locationId: "shenzhen-bay",
    location: "深圳 · 深圳湾",
    date: "今天",
    time: "18:30–21:00",
    category: "骑行",
    intensity: "正常",
    budget: "0–50 元",
    description: "沿海岸线轻松骑一圈，中途会停下来拍照。",
    current: 2,
    capacity: 5,
    tags: ["骑行", "夜景", "下班后"],
    status: "recruiting",
    favorite: false,
    organizerId: "other-user",
  },
  {
    id: "shuangyue-camp",
    title: "双月湾周末露营看星星",
    locationId: "shuangyue-bay",
    location: "惠州 · 双月湾",
    date: "本周六",
    time: "13:00–次日10:00",
    category: "露营",
    intensity: "轻松",
    budget: "200–300 元",
    description: "装备基本齐全，再找两位会做饭或会拍照的朋友。",
    current: 4,
    capacity: 6,
    tags: ["露营", "看星星", "过夜"],
    status: "recruiting",
    favorite: false,
    organizerId: "other-user",
  },
];

const initialApplications: Application[] = [
  { id: "app-cheng", activityId: "wutong-sunset", userId: "cheng", name: "阿诚", age: 27, joinedCount: 12, rate: "92%", message: "周末有空，平时经常徒步。", quickMessages: ["之前参加过类似活动"], tone: "green", status: "pending" },
  { id: "app-jia", activityId: "wutong-sunset", userId: "jiajia", name: "嘉嘉", age: 25, joinedCount: 2, rate: "100%", message: "想找人一起看日落～", quickMessages: ["我也很想去"], tone: "amber", status: "pending" },
];

const quickMessages = ["时间刚好合适", "我也很想去", "之前参加过类似活动"];
const defaultForm = { location: "梧桐山", when: "本周末", customDate: "", category: "徒步", people: "2", intensity: "正常", description: "想拍照看日落，不赶时间。", title: "周六一起去梧桐山徒步" };

function cloneInitialActivities() {
  return initialActivities.map((activity) => ({ ...activity, tags: [...activity.tags] }));
}

function cloneInitialApplications() {
  return initialApplications.map((application) => ({ ...application, quickMessages: [...application.quickMessages] }));
}

function Avatar({ label, tone = "blue" }: { label: string; tone?: "blue" | "pink" | "green" | "amber" }) {
  return <span className={`avatar avatar-${tone}`} aria-label={`${label}的头像`}>{label.slice(0, 1)}</span>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="tag">{children}</span>;
}

function ActivityCard({ activity, onClick }: { activity: Activity; onClick: () => void }) {
  return (
    <button className="activity-card" onClick={onClick} aria-label={`查看${activity.title}`}>
      <div className="card-topline">
        <span className="eyebrow">{activity.category} · {activity.intensity}节奏</span>
        <div className="card-status-line">{activity.favorite && <Bookmark size={15} fill="currentColor" />}<ChevronRight size={18} /></div>
      </div>
      <h3>{activity.title}</h3>
      <div className="meta-row"><CalendarDays size={15} /> {activity.date} · {activity.time}</div>
      <div className="meta-row"><Users size={15} /> {activity.current} / {activity.capacity} 人 · {eventStatusLabel(activity.status)}</div>
      <div className="tag-row">{activity.tags.slice(0, 3).map((tag) => <Tag key={tag}>{tag}</Tag>)}</div>
      <p>{activity.description}</p>
      <div className="organizer-mini"><Avatar label="小宇" /><span>小宇发起</span></div>
    </button>
  );
}

export default function Home() {
  const [page, setPage] = useState<Page>("discover");
  const [returnPage, setReturnPage] = useState<Page>("discover");
  const [role, setRole] = useState<Role>("participant");
  const [activities, setActivities] = useState<Activity[]>(cloneInitialActivities);
  const [applications, setApplications] = useState<Application[]>(cloneInitialApplications);
  const [selectedActivityId, setSelectedActivityId] = useState("wutong-sunset");
  const [selectedLocationId, setSelectedLocationId] = useState<LocationId>("wutong");
  const [interestOpen, setInterestOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedQuick, setSelectedQuick] = useState<string[]>([]);
  const [message, setMessage] = useState("我在南山，可以一起过去。");
  const [submittingInterest, setSubmittingInterest] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "accept"; appId: string } | { type: "cancel" } | { type: "exit" } | null>(null);
  const [activeApplicantId, setActiveApplicantId] = useState<string | null>(null);
  const [mockDialog, setMockDialog] = useState<"random" | "chat" | "sent" | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [filter, setFilter] = useState("全部");
  const [mineTab, setMineTab] = useState<MineTab>("published");
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("zhaodazi-v1-state-v2");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.activities)) setActivities(parsed.activities);
        if (Array.isArray(parsed.applications)) setApplications(parsed.applications);
      } catch { /* keep clean prototype defaults */ }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("zhaodazi-v1-state-v2", JSON.stringify({ activities, applications }));
  }, [activities, applications, hydrated]);

  const selectedActivity = activities.find((activity) => activity.id === selectedActivityId) ?? activities[0];
  const currentLocation = locations[selectedLocationId];
  const currentApplications = applications.filter((application) => application.activityId === selectedActivity.id);
  const pendingApplications = currentApplications.filter((application) => application.status === "pending");
  const acceptedApplications = currentApplications.filter((application) => application.status === "accepted");
  const activeApplicant = applications.find((application) => application.id === activeApplicantId) ?? acceptedApplications[0];
  const participantApplication = applications.find((application) => application.activityId === selectedActivity.id && application.userId === "participant-demo");
  const relation: Relation = participantApplication?.status ?? "none";
  const isOrganizerOfSelected = role === "organizer" && selectedActivity.organizerId === "organizer-demo";

  const listActivities = useMemo(() => {
    return activities.filter((activity) => {
      if (activity.locationId !== selectedLocationId) return false;
      if (filter === "今天") return activity.date === "今天";
      if (filter === "本周末") return ["本周六", "本周日"].includes(activity.date);
      if (filter === "轻松") return activity.intensity === "轻松";
      if (filter === "仅看有空位") return activity.status === "recruiting" && activity.current < activity.capacity;
      return true;
    });
  }, [activities, filter, selectedLocationId]);

  const searchResults = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return activities.slice(0, 5);
    return activities.filter((activity) => `${activity.title}${activity.location}${activity.category}${activity.tags.join("")}`.toLowerCase().includes(keyword)).slice(0, 6);
  }, [activities, searchQuery]);

  const mineCollections = useMemo(() => {
    const participantPendingIds = applications.filter((application) => application.userId === "participant-demo" && application.status === "pending").map((application) => application.activityId);
    const participantJoinedIds = applications.filter((application) => application.userId === "participant-demo" && application.status === "accepted").map((application) => application.activityId);
    return {
      published: activities.filter((activity) => role === "organizer" && activity.organizerId === "organizer-demo"),
      interested: activities.filter((activity) => participantPendingIds.includes(activity.id)),
      joined: activities.filter((activity) => participantJoinedIds.includes(activity.id)),
      favorites: activities.filter((activity) => activity.favorite),
      history: activities.filter((activity) => activity.status === "ended"),
    } satisfies Record<MineTab, Activity[]>;
  }, [activities, applications, role]);

  const goDetail = (activity: Activity, from: Page) => {
    setSelectedActivityId(activity.id);
    setReturnPage(from);
    setPage("detail");
  };

  const openLocation = (locationId: LocationId, initialFilter = "全部") => {
    setSelectedLocationId(locationId);
    setFilter(initialFilter);
    setPage("list");
  };

  const updateActivity = (activityId: string, updater: (activity: Activity) => Activity) => {
    setActivities((current) => current.map((activity) => activity.id === activityId ? updater(activity) : activity));
  };

  const toggleFavorite = () => {
    updateActivity(selectedActivity.id, (activity) => ({ ...activity, favorite: !activity.favorite }));
    toast.success(selectedActivity.favorite ? "已取消收藏" : "已加入收藏");
  };

  const sendApplication = () => {
    if (!message.trim() && selectedQuick.length === 0) {
      toast.error("请至少选择一句快捷表达或补充一句话");
      return;
    }
    setSubmittingInterest(true);
    window.setTimeout(() => {
      setApplications((current) => {
        const existing = current.find((application) => application.activityId === selectedActivity.id && application.userId === "participant-demo");
        if (existing) {
          return current.map((application) => application.id === existing.id ? { ...application, message: message.trim(), quickMessages: selectedQuick, status: "pending" } : application);
        }
        return [...current, { id: `application-${Date.now()}`, activityId: selectedActivity.id, userId: "participant-demo", name: "小安", age: 24, joinedCount: 5, rate: "100%", message: message.trim(), quickMessages: selectedQuick, tone: "pink", status: "pending" }];
      });
      setSubmittingInterest(false);
      setInterestOpen(false);
      setMockDialog("sent");
    }, 500);
  };

  const acceptApplication = (applicationId: string) => {
    const application = applications.find((item) => item.id === applicationId);
    if (!application || application.status !== "pending") return;
    setApplications((current) => current.map((item) => item.id === applicationId ? { ...item, status: "accepted" } : item));
    updateActivity(application.activityId, (activity) => {
      const nextCount = Math.min(activity.capacity, activity.current + 1);
      return { ...activity, current: nextCount, status: nextCount >= activity.capacity ? "full" : activity.status };
    });
    setActiveApplicantId(applicationId);
    setConfirmAction(null);
    setPage("success");
  };

  const rejectApplication = (applicationId: string) => {
    setApplications((current) => current.map((application) => application.id === applicationId ? { ...application, status: "rejected" } : application));
    toast.info("已标记为暂不合适");
  };

  const exitActivity = () => {
    const application = applications.find((item) => item.activityId === selectedActivity.id && item.userId === "participant-demo" && item.status === "accepted");
    if (!application) return;
    setApplications((current) => current.map((item) => item.id === application.id ? { ...item, status: "withdrawn" } : item));
    updateActivity(selectedActivity.id, (activity) => ({ ...activity, current: Math.max(1, activity.current - 1), status: activity.status === "full" ? "recruiting" : activity.status }));
    setConfirmAction(null);
    toast.success("已退出活动，名额已恢复");
  };

  const cancelActivity = () => {
    updateActivity(selectedActivity.id, (activity) => ({ ...activity, status: "cancelled" }));
    setConfirmAction(null);
    toast.success("活动已取消，参与者将看到取消状态");
  };

  const setDebugEventStatus = (status: EventStatus) => {
    updateActivity(selectedActivity.id, (activity) => ({
      ...activity,
      status,
      current: status === "full" ? activity.capacity : status === "recruiting" && activity.current >= activity.capacity ? Math.max(1, activity.capacity - 1) : activity.current,
    }));
  };

  const setDebugRelation = (nextRelation: Relation) => {
    setApplications((current) => {
      const existing = current.find((application) => application.activityId === selectedActivity.id && application.userId === "participant-demo");
      if (nextRelation === "none") return current.filter((application) => application.id !== existing?.id);
      if (existing) return current.map((application) => application.id === existing.id ? { ...application, status: nextRelation as ApplicationStatus } : application);
      return [...current, { id: `debug-${selectedActivity.id}`, activityId: selectedActivity.id, userId: "participant-demo", name: "小安", age: 24, joinedCount: 5, rate: "100%", message: "我在南山，可以一起过去。", quickMessages: ["时间刚好合适"], tone: "pink", status: nextRelation as ApplicationStatus }];
    });
    const wasAccepted = relation === "accepted";
    const willBeAccepted = nextRelation === "accepted";
    if (wasAccepted !== willBeAccepted) {
      updateActivity(selectedActivity.id, (activity) => ({ ...activity, current: Math.max(1, Math.min(activity.capacity, activity.current + (willBeAccepted ? 1 : -1))) }));
    }
  };

  const reset = () => {
    setActivities(cloneInitialActivities());
    setApplications(cloneInitialApplications());
    setRole("participant");
    setSelectedActivityId("wutong-sunset");
    setSelectedLocationId("wutong");
    setSelectedQuick([]);
    setMessage("我在南山，可以一起过去。");
    setMineTab("published");
    setForm(defaultForm);
    localStorage.removeItem("zhaodazi-v1-state-v2");
    setPage("discover");
    toast.success("Mock 数据已重置");
  };

  const updateFormChoice = (key: "location" | "when" | "category" | "people" | "intensity", value: string) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      const day = next.when === "本周末" ? "周六" : next.when;
      next.title = `${day}一起去${next.location}${next.category}`;
      return next;
    });
    setFormErrors((current) => ({ ...current, [key]: "" }));
  };

  const publish = () => {
    const errors: Record<string, string> = {};
    if (!form.description.trim()) errors.description = "请补充一句活动说明";
    if (!form.title.trim()) errors.title = "标题不能为空";
    if (form.when === "自定义" && !form.customDate) errors.customDate = "请选择具体日期";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error("请先完成必填信息");
      return;
    }
    setPublishing(true);
    window.setTimeout(() => {
      const locationId = (Object.entries(locations).find(([, location]) => location.name === form.location)?.[0] ?? "wutong") as LocationId;
      const next: Activity = {
        id: `created-${Date.now()}`,
        title: form.title.trim(),
        locationId,
        location: `${locations[locationId].district.split(" · ")[0]} · ${form.location}`,
        date: form.when === "自定义" ? form.customDate : form.when === "本周末" ? "本周六" : form.when,
        time: "14:00–20:00",
        category: form.category,
        intensity: form.intensity,
        budget: "待商量",
        description: form.description.trim(),
        current: 1,
        capacity: 1 + Number(form.people.replace("+", "")),
        tags: [`${form.intensity}节奏`, form.category, "新计划"],
        status: "recruiting",
        favorite: false,
        organizerId: "organizer-demo",
      };
      setActivities((current) => [...current, next]);
      setSelectedActivityId(next.id);
      setSelectedLocationId(locationId);
      setReturnPage("mine");
      setRole("organizer");
      setPublishing(false);
      setPage("detail");
      toast.success("计划发布成功");
    }, 650);
  };

  const primaryAction = participantPrimaryAction(selectedActivity, relation);
  const confirmCopy = getConfirmCopy(confirmAction, applications, selectedActivity);

  return (
    <main className="prototype-stage">
      <div className="phone-shell">
        <div className="phone-status"><span>9:41</span><span>● ︵ ▰</span></div>
        <div className="screen">
          {page === "discover" && (
            <section className="page map-page">
              <header className="map-header">
                <div><span className="eyebrow">当前城市</span><strong>深圳 <span aria-hidden>⌄</span></strong></div>
                <button className="search-pill" onClick={() => setSearchOpen(true)}><Search size={18} /><span>搜索地点或活动</span></button>
              </header>
              <div className="chip-scroll">
                <button className="chip" onClick={() => openLocation("wutong", "本周末")}>本周末</button>
                <button className="chip" onClick={() => openLocation("wutong", "仅看有空位")}>附近</button>
                <button className="chip" onClick={() => openLocation("wutong", "轻松")}>轻松活动</button>
                <button className="chip" onClick={() => setSearchOpen(true)}>更多筛选</button>
              </div>
              <div className="mock-map" aria-label="活动地点地图">
                <span className="road road-one" /><span className="road road-two" /><span className="water" />
                {(Object.entries(locations) as [LocationId, typeof locations[LocationId]][]).map(([id, location]) => (
                  <button className={`map-marker ${location.markerClass}`} key={id} onClick={() => openLocation(id)}><MapPin size={14} />{location.name}<b>{location.planCount}</b></button>
                ))}
                <div className="map-label label-city">罗湖区</div><div className="map-label label-sea">大鹏湾</div>
              </div>
              <div className="map-bottom">
                <div className="section-heading"><div><span className="eyebrow">就在附近</span><h2>正在招募的计划</h2></div><button onClick={() => setMockDialog("random")}><Sparkles size={16} />不知道去哪？</button></div>
                <button className="featured-card" onClick={() => goDetail(activities.find((item) => item.id === "wutong-sunset") ?? activities[0], "discover")}>
                  <div className="featured-icon"><Footprints size={25} /></div>
                  <div><h3>{activities.find((item) => item.id === "wutong-sunset")?.title}</h3><p>{activities.find((item) => item.id === "wutong-sunset")?.date} 14:00 · {activities.find((item) => item.id === "wutong-sunset")?.current}/{activities.find((item) => item.id === "wutong-sunset")?.capacity}人</p><div className="tag-row"><Tag>正常强度</Tag><Tag>拍照</Tag><Tag>日落</Tag></div></div>
                  <ChevronRight size={20} />
                </button>
              </div>
            </section>
          )}

          {page === "list" && (
            <section className="page scroll-page">
              <TopBar title={currentLocation.name} onBack={() => setPage("discover")} />
              <div className="content-pad list-intro"><span className="eyebrow">{currentLocation.district}</span><h1>{currentLocation.name}</h1><p>{currentLocation.planCount} 个正在招募的计划 · 当前展示 {listActivities.length} 个</p></div>
              <div className="chip-scroll sticky-chips">{["全部", "今天", "本周末", "轻松", "仅看有空位"].map((item) => <button className={`chip ${filter === item ? "active" : ""}`} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
              <div className="card-list content-pad">
                {listActivities.map((activity) => <ActivityCard key={activity.id} activity={activity} onClick={() => goDetail(activity, "list")} />)}
                {listActivities.length === 0 && <div className="empty-card"><Search /><h2>没有符合条件的计划</h2><p>换一个筛选条件再看看。</p><Button variant="outline" onClick={() => setFilter("全部")}>清除筛选</Button></div>}
              </div>
            </section>
          )}

          {page === "detail" && (
            <section className="page scroll-page detail-page">
              <TopBar title="活动详情" onBack={() => setPage(returnPage)} right={<button className={`icon-button ${selectedActivity.favorite ? "favorite-active" : ""}`} onClick={toggleFavorite} aria-label={selectedActivity.favorite ? "取消收藏" : "收藏"}><Bookmark size={20} fill={selectedActivity.favorite ? "currentColor" : "none"} /></button>} />
              {selectedActivity.status === "cancelled" && <div className="status-banner danger"><AlertCircle size={18} />活动已取消，所有参与者已收到通知</div>}
              {selectedActivity.status === "ended" && <div className="status-banner">活动已结束</div>}
              {selectedActivity.status === "full" && <div className="status-banner"><Users size={18} />活动人数已满</div>}
              <div className="content-pad detail-hero">
                <span className="eyebrow">{selectedActivity.category} · {selectedActivity.intensity}节奏</span>
                <h1>{selectedActivity.title}</h1>
                <div className="facts-grid">
                  <div><CalendarDays /><span><small>时间</small>{selectedActivity.date}<br />{selectedActivity.time}</span></div>
                  <div><MapPin /><span><small>地点</small>{selectedActivity.location}</span></div>
                  <div><span className="fact-symbol">¥</span><span><small>预计预算</small>{selectedActivity.budget}</span></div>
                  <div><Users /><span><small>当前人数</small>{selectedActivity.current} / {selectedActivity.capacity} 人</span></div>
                </div>
              </div>
              <div className="detail-section"><h2>这次怎么玩</h2><p>{selectedActivity.description}</p></div>
              <div className="detail-section"><h2>这是一个什么样的局</h2><div className="tag-row large">{selectedActivity.tags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div></div>
              <div className="detail-section"><div className="section-heading compact"><h2>一起去的人</h2><span>{selectedActivity.current} 人</span></div><div className="people-row"><div><Avatar label="小宇" tone="blue" /><b>小宇</b><small>发起人 · 履约率 100%</small></div><div><Avatar label="林" tone="pink" /><b>小林</b><small>参加过 3 次</small></div><div><Avatar label="阿" tone="green" /><b>阿杰</b><small>参加过 8 次</small></div>{acceptedApplications.slice(0, 1).map((application) => <div key={application.id}><Avatar label={application.name} tone={application.tone} /><b>{application.name}</b><small>刚刚加入</small></div>)}</div></div>
              {isOrganizerOfSelected && selectedActivity.status === "recruiting" && <button className="application-entry" onClick={() => setPage("applications")}><span><b>{pendingApplications.length} 人等待你的确认</b><small>查看并处理搭子申请</small></span><ChevronRight /></button>}
              {(isOrganizerOfSelected || relation === "accepted") && <div className="detail-management">{isOrganizerOfSelected && selectedActivity.status !== "cancelled" && selectedActivity.status !== "ended" && <button onClick={() => setConfirmAction({ type: "cancel" })}>取消活动</button>}{relation === "accepted" && selectedActivity.status !== "cancelled" && selectedActivity.status !== "ended" && <button onClick={() => setConfirmAction({ type: "exit" })}>退出活动</button>}</div>}
              <div className="bottom-spacer" />
              <div className="bottom-action">
                {isOrganizerOfSelected ? <><Button variant="outline" size="lg" onClick={() => setPage("applications")} disabled={["cancelled", "ended"].includes(selectedActivity.status)}><Users />查看申请</Button><Button size="lg" onClick={() => setPage("success")} disabled={acceptedApplications.length === 0}>查看组队</Button></> : <><Button variant="outline" size="lg" onClick={toggleFavorite}><Bookmark fill={selectedActivity.favorite ? "currentColor" : "none"} />{selectedActivity.favorite ? "已收藏" : "收藏"}</Button><Button size="lg" disabled={!primaryAction.enabled} onClick={() => primaryAction.enabled && setInterestOpen(true)}>{primaryAction.label}</Button></>}
              </div>
            </section>
          )}

          {page === "publish" && (
            <section className="page scroll-page">
              <TopBar title="发布计划" onBack={() => setPage("discover")} />
              <div className="content-pad publish-intro"><span className="eyebrow">轻量发起</span><h1>这次想去哪？</h1><p>先把计划说清楚，再找合适的搭子。</p></div>
              <div className="form-stack content-pad">
                <ChoiceField label="去哪" options={["梧桐山", "大鹏", "双月湾", "深圳湾"]} value={form.location} onChange={(value) => updateFormChoice("location", value)} />
                <ChoiceField label="什么时候" options={["今天", "明天", "本周末", "自定义"]} value={form.when} onChange={(value) => updateFormChoice("when", value)} />
                {form.when === "自定义" && <label className={`field ${formErrors.customDate ? "field-error" : ""}`}><span>具体日期</span><input type="date" value={form.customDate} onChange={(event) => { setForm({ ...form, customDate: event.target.value }); setFormErrors({ ...formErrors, customDate: "" }); }} />{formErrors.customDate && <small className="error-text">{formErrors.customDate}</small>}</label>}
                <ChoiceField label="想做什么" options={["徒步", "海边", "露营", "Citywalk", "骑行", "自驾"]} value={form.category} onChange={(value) => updateFormChoice("category", value)} />
                <ChoiceField label="再找几个人" options={["1", "2", "3", "4+"]} value={form.people} onChange={(value) => updateFormChoice("people", value)} />
                <ChoiceField label="什么节奏" options={["轻松", "正常", "特种兵"]} value={form.intensity} onChange={(value) => updateFormChoice("intensity", value)} />
                <label className={`field ${formErrors.description ? "field-error" : ""}`}><span>一句话说明</span><textarea value={form.description} onChange={(event) => { setForm({ ...form, description: event.target.value }); setFormErrors({ ...formErrors, description: "" }); }} maxLength={80} /><small className={formErrors.description ? "error-text" : ""}>{formErrors.description || `${form.description.length}/80`}</small></label>
                <label className={`field generated ${formErrors.title ? "field-error" : ""}`}><span>自动生成标题 <em>可编辑</em></span><input value={form.title} onChange={(event) => { setForm({ ...form, title: event.target.value }); setFormErrors({ ...formErrors, title: "" }); }} /><Sparkles size={18} />{formErrors.title && <small className="error-text">{formErrors.title}</small>}</label>
                <Button size="lg" className="wide-button" onClick={publish} disabled={publishing}>{publishing ? "发布中…" : "发布计划"}</Button>
              </div>
            </section>
          )}

          {page === "applications" && (
            <section className="page scroll-page">
              <TopBar title="搭子申请" onBack={() => setPage("detail")} />
              <div className="content-pad applications-intro"><span className="eyebrow">{selectedActivity.title}</span><h1>{pendingApplications.length} 人等待确认</h1><p>处理结果会同步到对应参与者和活动人数。</p></div>
              <div className="card-list content-pad">
                {currentApplications.map((application) => <ApplicationCard key={application.id} application={application} eventClosed={selectedActivity.status !== "recruiting"} onAccept={() => setConfirmAction({ type: "accept", appId: application.id })} onReject={() => rejectApplication(application.id)} />)}
                {currentApplications.length === 0 && <div className="empty-card"><Users /><h2>暂时还没有申请</h2><p>有人表达兴趣后会出现在这里。</p><Button variant="outline" onClick={() => setPage("detail")}>返回计划</Button></div>}
              </div>
            </section>
          )}

          {page === "success" && (
            <section className="page success-page">
              <button className="success-close" onClick={() => setPage("detail")} aria-label="关闭"><X /></button>
              <div className="success-mark"><Check size={38} /></div><span className="eyebrow">双向确认完成</span><h1>组队成功</h1><p>{activeApplicant ? `${activeApplicant.name} 已经加入这次计划。` : "你们已经成为这次出行的搭子。"}</p>
              <div className="success-card"><div className="success-route"><span>{selectedActivity.date}</span><div /><span>{locations[selectedActivity.locationId].name}</span></div><h2>{selectedActivity.title}</h2><p>{selectedActivity.time} · 当前 {selectedActivity.current}/{selectedActivity.capacity} 人</p><div className="avatar-stack"><Avatar label="小宇" /><Avatar label="林" tone="pink" /><Avatar label="阿" tone="green" />{activeApplicant && <Avatar label={activeApplicant.name} tone={activeApplicant.tone} />}</div></div>
              <div className="success-actions"><Button size="lg" onClick={() => setMockDialog("chat")}><MessageCircle />联系大家</Button><Button variant="outline" size="lg" onClick={() => setPage("detail")}>查看计划</Button></div>
            </section>
          )}

          {page === "mine" && (
            <section className="page scroll-page">
              <div className="content-pad mine-head"><span className="eyebrow">个人中心 · {role === "participant" ? "参与者" : "发起人"}视角</span><h1>我的计划</h1><div className="profile-row"><Avatar label={role === "participant" ? "小安" : "小宇"} /><div><b>{role === "participant" ? "小安" : "小宇"}</b><p>参加过 6 次活动 · 履约率 100%</p></div></div></div>
              <div className="summary-grid content-pad">{(["published", "interested", "joined", "favorites", "history"] as MineTab[]).map((tab) => <button className={mineTab === tab ? "active" : ""} key={tab} onClick={() => setMineTab(tab)}><b>{mineCollections[tab].length}</b><span>{mineTabLabel(tab)}</span></button>)}</div>
              <div className="card-list content-pad">{mineCollections[mineTab].map((activity) => <ActivityCard key={activity.id} activity={activity} onClick={() => goDetail(activity, "mine")} />)}{mineCollections[mineTab].length === 0 && <div className="empty-card"><Compass /><h2>这里还没有计划</h2><p>{mineTab === "published" ? "从一个想去的地方开始吧。" : "完成对应操作后，计划会出现在这里。"}</p>{mineTab === "published" && <Button onClick={() => setPage("publish")}>发布计划</Button>}</div>}</div>
            </section>
          )}
        </div>

        {page !== "success" && <BottomTabs page={page} onChange={setPage} />}
        <button className="debug-fab" aria-label="打开原型测试面板" onClick={() => setDebugOpen(!debugOpen)}><Bug size={18} /></button>
        {debugOpen && <DebugPanel role={role} eventStatus={selectedActivity.status} relation={relation} onRole={setRole} onEventStatus={setDebugEventStatus} onRelation={setDebugRelation} onClose={() => setDebugOpen(false)} onReset={reset} />}
      </div>

      <Sheet open={interestOpen} onOpenChange={setInterestOpen}>
        <SheetContent side="bottom" className="interest-sheet">
          <SheetHeader><SheetTitle>和发起人打个招呼</SheetTitle><SheetDescription>快捷表达和补充文字会一起发送给发起人。</SheetDescription></SheetHeader>
          <div className="sheet-body"><div className="quick-grid">{quickMessages.map((item) => <button key={item} className={selectedQuick.includes(item) ? "selected" : ""} onClick={() => setSelectedQuick((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])}>{selectedQuick.includes(item) && <Check size={15} />}{item}</button>)}</div><label className="field"><span>补充一句</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="比如：我在南山，可以一起过去。" /></label></div>
          <SheetFooter><Button size="lg" onClick={sendApplication} disabled={submittingInterest}><Send />{submittingInterest ? "发送中…" : "发送申请"}</Button></SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={searchOpen} onOpenChange={setSearchOpen}>
        <SheetContent side="bottom" className="interest-sheet search-sheet">
          <SheetHeader><SheetTitle>搜索地点或活动</SheetTitle><SheetDescription>输入地点、活动类型或标签。</SheetDescription></SheetHeader>
          <div className="sheet-body"><label className="search-input"><Search size={18} /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="例如：大鹏、露营、日落" /></label><div className="search-results">{searchResults.map((activity) => <button key={activity.id} onClick={() => { setSearchOpen(false); goDetail(activity, "discover"); }}><span><b>{activity.title}</b><small>{activity.location} · {activity.date}</small></span><ChevronRight size={18} /></button>)}{searchResults.length === 0 && <p>没有找到相关计划</p>}</div></div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>{confirmCopy.title}</AlertDialogTitle><AlertDialogDescription>{confirmCopy.description}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>再想想</AlertDialogCancel><AlertDialogAction variant={confirmAction?.type === "cancel" || confirmAction?.type === "exit" ? "destructive" : "default"} onClick={() => { if (confirmAction?.type === "accept") acceptApplication(confirmAction.appId); if (confirmAction?.type === "cancel") cancelActivity(); if (confirmAction?.type === "exit") exitActivity(); }}>{confirmCopy.action}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={mockDialog !== null} onOpenChange={(open) => !open && setMockDialog(null)}>
        <AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>{mockDialog === "random" ? "今天去大鹏看海吧" : mockDialog === "chat" ? "临时群聊（Mock）" : "申请已发送"}</AlertDialogTitle><AlertDialogDescription>{mockDialog === "random" ? "为你抽到：周日下午的大鹏海边散步计划。" : mockDialog === "chat" ? "V1 原型暂不接入真实聊天，这里模拟进入临时群聊。" : "发起人确认后，你会加入这次活动。详情页已更新为“等待确认”。"}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter>{mockDialog === "random" && <AlertDialogCancel>再抽一次</AlertDialogCancel>}<AlertDialogAction onClick={() => { if (mockDialog === "random") { const activity = activities.find((item) => item.id === "dapeng-seaside"); if (activity) goDetail(activity, "discover"); } setMockDialog(null); }}>{mockDialog === "random" ? "查看计划" : "知道了"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <Toaster position="top-center" />
    </main>
  );
}

function TopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return <header className="top-bar"><button className="icon-button" onClick={onBack} aria-label="返回"><ArrowLeft /></button><b>{title}</b><span className="top-right">{right}</span></header>;
}

function BottomTabs({ page, onChange }: { page: Page; onChange: (page: Page) => void }) {
  const selected = page === "publish" ? "publish" : page === "mine" ? "mine" : "discover";
  return <nav className="bottom-tabs" aria-label="主导航"><button className={selected === "discover" ? "active" : ""} onClick={() => onChange("discover")}><Compass /><span>发现</span></button><button className={selected === "publish" ? "active publish-tab" : "publish-tab"} onClick={() => onChange("publish")}><span className="plus-ring"><Plus /></span><span>发布</span></button><button className={selected === "mine" ? "active" : ""} onClick={() => onChange("mine")}><CircleUserRound /><span>我的</span></button></nav>;
}

function ChoiceField({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (value: string) => void }) {
  return <fieldset className="choice-field"><legend>{label}</legend><div>{options.map((option) => <button type="button" key={option} className={value === option ? "selected" : ""} onClick={() => onChange(option)}>{value === option && <Check size={14} />}{option}</button>)}</div></fieldset>;
}

function ApplicationCard({ application, eventClosed, onAccept, onReject }: { application: Application; eventClosed: boolean; onAccept: () => void; onReject: () => void }) {
  const processed = application.status !== "pending";
  return <article className="application-card"><div className="applicant-head"><Avatar label={application.name} tone={application.tone} /><div><h2>{application.name} <small>{application.age} 岁</small></h2><p>参加过 {application.joinedCount} 次活动 · 履约率 {application.rate}</p></div></div>{application.quickMessages.length > 0 && <div className="tag-row application-tags">{application.quickMessages.map((item) => <Tag key={item}>{item}</Tag>)}</div>}<blockquote>“{application.message || "没有补充文字"}”</blockquote><div className="application-actions"><Button variant="outline" disabled={processed || eventClosed} onClick={onReject}>{application.status === "rejected" ? "已婉拒" : "暂不合适"}</Button><Button disabled={processed || eventClosed} onClick={onAccept}>{application.status === "accepted" ? <><Check />已加入</> : application.status === "withdrawn" ? "已退出" : application.status === "rejected" ? "已处理" : "一起去"}</Button></div></article>;
}

function DebugPanel({ role, eventStatus, relation, onRole, onEventStatus, onRelation, onClose, onReset }: { role: Role; eventStatus: EventStatus; relation: Relation; onRole: (role: Role) => void; onEventStatus: (status: EventStatus) => void; onRelation: (relation: Relation) => void; onClose: () => void; onReset: () => void }) {
  return <aside className="debug-panel"><div className="debug-title"><span><Bug size={16} />Prototype Debug</span><button onClick={onClose} aria-label="关闭测试面板"><X size={16} /></button></div><label>当前视角<select value={role} onChange={(event) => onRole(event.target.value as Role)}><option value="participant">普通参与者</option><option value="organizer">活动发起人</option></select></label><label>当前活动状态<select value={eventStatus} onChange={(event) => onEventStatus(event.target.value as EventStatus)}><option value="recruiting">招募中</option><option value="full">已满员</option><option value="cancelled">已取消</option><option value="ended">已结束</option></select></label><label>参与关系<select value={relation} onChange={(event) => onRelation(event.target.value as Relation)}><option value="none">未申请</option><option value="pending">已申请</option><option value="accepted">已加入</option><option value="rejected">未通过</option><option value="withdrawn">已退出</option></select></label><button className="reset-button" onClick={onReset}><RotateCcw size={15} />Reset Mock Data</button></aside>;
}

function participantPrimaryAction(activity: Activity, relation: Relation) {
  if (activity.status === "cancelled") return { label: "活动已取消", enabled: false };
  if (activity.status === "ended") return { label: "活动已结束", enabled: false };
  if (relation === "pending") return { label: "等待确认", enabled: false };
  if (relation === "accepted") return { label: "已加入", enabled: false };
  if (relation === "rejected") return { label: "暂未通过", enabled: false };
  if (relation === "withdrawn") return { label: "已退出", enabled: false };
  if (activity.status === "full" || activity.current >= activity.capacity) return { label: "人数已满", enabled: false };
  return { label: "我感兴趣", enabled: true };
}

function eventStatusLabel(status: EventStatus) {
  return { recruiting: "招募中", full: "已满员", cancelled: "已取消", ended: "已结束" }[status];
}

function mineTabLabel(tab: MineTab) {
  return { published: "我发布的", interested: "感兴趣", joined: "已加入", favorites: "收藏", history: "历史" }[tab];
}

function getConfirmCopy(action: { type: "accept"; appId: string } | { type: "cancel" } | { type: "exit" } | null, applications: Application[], activity: Activity) {
  if (action?.type === "accept") {
    const application = applications.find((item) => item.id === action.appId);
    return { title: `确认邀请${application?.name ?? "这位搭子"}一起去吗？`, description: `确认后，活动人数将更新为 ${Math.min(activity.capacity, activity.current + 1)}/${activity.capacity}。`, action: "确认邀请" };
  }
  if (action?.type === "cancel") return { title: "确认取消这次活动吗？", description: "取消后，所有参与者都会看到活动已取消，申请入口也将关闭。", action: "确认取消" };
  if (action?.type === "exit") return { title: "确认退出这次活动吗？", description: "退出后将释放一个名额，如需参加需要重新申请。", action: "确认退出" };
  return { title: "请确认操作", description: "确认后将更新当前活动状态。", action: "确认" };
}
