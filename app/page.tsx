"use client";

import { useEffect, useMemo, useReducer, useRef, useState } from "react";
import { AlertCircle, ArrowDown, ArrowLeft, ArrowUp, Bell, Bookmark, BriefcaseBusiness, Bug, CalendarDays, Camera, Check, ChevronDown, ChevronRight, CircleUserRound, Clock3, Compass, Footprints, ImagePlus, MapPin, MessageCircle, Plus, RotateCcw, Search, Send, Settings, ShieldCheck, Sparkles, Star, Users, WalletCards, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { createInitialState, locations as initialLocations } from "@/lib/zhaodazi/mock-data";
import { getRecommendations, type Recommendation } from "@/lib/zhaodazi/recommendation";
import { prototypeReducer } from "@/lib/zhaodazi/reducer";
import { effectiveActivityStatus, eventStatusLabel, getActivityParticipants, getConfirmedCount, getLocationPlanCount, getMineActivities, getParticipantCount, getUserApplication, getUserParticipant, isFavorite } from "@/lib/zhaodazi/selectors";
import { clearPrototypeState, clearPublishDraft, loadPrototypeState, loadPublishDraft, savePrototypeState, savePublishDraft } from "@/lib/zhaodazi/storage";
import type { Activity, ActivityCategory, ActivityStatus, AvailableTime, BudgetLabel, DistancePreference, Intensity, MineTab, Page, ParticipantStatus, PrototypeState, PublishForm, SocialStyle, TransportMode, User, UserPreference } from "@/lib/zhaodazi/types";

const quickMessages = ["时间刚好合适", "我也很想去", "之前参加过类似活动"];
const categories: ActivityCategory[] = ["徒步", "海边", "露营", "Citywalk", "骑行", "自驾", "看展", "滑雪", "短途旅行"];
const availableTimes: AvailableTime[] = ["工作日晚上", "周六", "周日", "周末", "节假日"];
const mineTabs: MineTab[] = ["published", "interested", "joined", "pendingConfirm", "upcoming", "favorites", "history"];
const publishDestinations = [
  { id: "starry-bookstore", name: "星寰书屋", locationId: "futian" as const, meta: "深圳市 · 独立书店 · 12.3km", tone: "bookstore" },
  { id: "nantou-old-town", name: "南头古城", locationId: "shenzhen-bay" as const, meta: "深圳市 · 历史文化街区 · 8.6km", tone: "oldtown" },
  { id: "shenzhen-bay-park", name: "深圳湾公园", locationId: "shenzhen-bay" as const, meta: "深圳市 · 海滨公园 · 看日落", tone: "seaside" },
  { id: "wutong", name: "梧桐山", locationId: "wutong" as const, meta: "深圳市 · 罗湖区 · 徒步热门", tone: "mountain" },
  { id: "dapeng", name: "大鹏海边", locationId: "dapeng" as const, meta: "深圳市 · 大鹏新区 · 海边", tone: "coast" },
] as const;
const defaultForm: PublishForm = { destinationIds: [], startDate: "", endDate: "", flexibleDates: false, photos: [], description: "", transport: "", budgetLabel: "", meetingPoint: "", notices: [], extraNotes: "", title: "" };

function localDateValue(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isValidPublishDateRange(start: string, end: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end) && start >= localDateValue() && end >= start;
}

function hasPublishDraft(form: PublishForm) {
  return Boolean(form.destinationIds.length || form.startDate || form.endDate || form.photos.length || form.description.trim() || form.transport || form.budgetLabel || form.meetingPoint.trim() || form.notices.length || form.extraNotes.trim());
}

function activityTimeText(activity: Activity) {
  return activity.endDate && activity.endDate !== activity.date ? `${activity.startTime} 出发` : `${activity.startTime}–${activity.endTime}`;
}

function departureCountdown(date: string) {
  const today = new Date(`${localDateValue()}T00:00:00`);
  const target = new Date(`${date}T00:00:00`);
  const days = Math.round((target.getTime() - today.getTime()) / 86_400_000);
  if (days > 0) return `距离出发还有 ${days} 天`;
  if (days === 0) return "今天出发";
  return "出发日期已过";
}

function Avatar({ user, fallback = "搭" }: { user?: User; fallback?: string }) {
  return <span className={`avatar avatar-${user?.tone ?? "blue"}`} aria-label={`${user?.name ?? fallback}的头像`}>{user?.avatar ?? fallback.slice(0, 1)}</span>;
}

function Tag({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return <span className={`tag ${accent ? "tag-accent" : ""}`}>{children}</span>;
}

function TopBar({ title, onBack, right }: { title: string; onBack: () => void; right?: React.ReactNode }) {
  return <header className="top-bar"><button className="icon-button" onClick={onBack} aria-label="返回"><ArrowLeft /></button><b>{title}</b><span className="top-right">{right}</span></header>;
}

function BottomTabs({ page, onChange }: { page: Page; onChange: (page: Page) => void }) {
  const selected = page === "publish" ? "publish" : page === "mine" || ["preference", "profile", "preparation"].includes(page) ? "mine" : "discover";
  return <nav className="bottom-tabs" aria-label="主导航"><button className={selected === "discover" ? "active" : ""} onClick={() => onChange("discover")}><Compass /><span>发现</span></button><button className={selected === "publish" ? "active publish-tab" : "publish-tab"} onClick={() => onChange("publish")}><span className="plus-ring"><Plus /></span><span>发布</span></button><button className={selected === "mine" ? "active" : ""} onClick={() => onChange("mine")}><CircleUserRound /><span>我的</span></button></nav>;
}

function ChoiceField<T extends string>({ label, options, value, onChange }: { label: string; options: readonly T[]; value: T; onChange: (value: T) => void }) {
  return <fieldset className="choice-field"><legend>{label}</legend><div>{options.map((option) => <button type="button" key={option} className={value === option ? "selected" : ""} onClick={() => onChange(option)}>{value === option && <Check size={14} />}{option}</button>)}</div></fieldset>;
}

function MultiChoice<T extends string>({ label, options, value, max, onChange }: { label: string; options: readonly T[]; value: T[]; max?: number; onChange: (value: T[]) => void }) {
  const toggle = (option: T) => {
    if (value.includes(option)) onChange(value.filter((item) => item !== option));
    else if (!max || value.length < max) onChange([...value, option]);
    else toast.info(`最多选择 ${max} 个`);
  };
  return <fieldset className="choice-field"><legend>{label}{max && <small> 最多 {max} 个</small>}</legend><div>{options.map((option) => <button type="button" key={option} className={value.includes(option) ? "selected" : ""} onClick={() => toggle(option)}>{value.includes(option) && <Check size={14} />}{option}</button>)}</div></fieldset>;
}

function ActivityCard({ state, activity, onClick, recommendation }: { state: PrototypeState; activity: Activity; onClick: () => void; recommendation?: Recommendation }) {
  const status = effectiveActivityStatus(state, activity);
  const organizer = state.users.find((user) => user.id === activity.organizerId);
  return <button className="activity-card" onClick={onClick} aria-label={`查看${activity.title}`}><div className="card-topline"><span className="eyebrow">{activity.category} · {activity.intensity}节奏</span><div className="card-status-line">{isFavorite(state, activity.id) && <Bookmark size={15} fill="currentColor" />}<ChevronRight size={18} /></div></div><h3>{activity.title}</h3><div className="meta-row"><CalendarDays size={15} /> {activity.dateLabel} · {activityTimeText(activity)}</div><div className="meta-row"><Users size={15} /> {getParticipantCount(state, activity.id)} / {activity.capacity} 人 · {eventStatusLabel(status)}</div>{[activity.socialStyle, activity.photoStyle, activity.spendingStyle].some(Boolean) && <div className="tag-row">{activity.socialStyle && <Tag>{activity.socialStyle}</Tag>}{activity.photoStyle && <Tag>{activity.photoStyle}</Tag>}{activity.spendingStyle && <Tag>{activity.spendingStyle}</Tag>}</div>}{recommendation && recommendation.reasons.length > 0 && <div className="recommendation-line"><Sparkles size={14} /><span>{recommendation.reasons.join(" · ")}</span></div>}<p>{activity.description}</p><div className="organizer-mini"><Avatar user={organizer} /><span>{organizer?.name ?? "搭子"}发起</span></div></button>;
}

export default function Home() {
  const [state, dispatch] = useReducer(prototypeReducer, undefined, createInitialState);
  const [hydrated, setHydrated] = useState(false);
  const [page, setPage] = useState<Page>("discover");
  const [returnPage, setReturnPage] = useState<Page>("discover");
  const [selectedActivityId, setSelectedActivityId] = useState("wutong-sunset");
  const [selectedLocationId, setSelectedLocationId] = useState(initialLocations[0].id);
  const [selectedMapLocationId, setSelectedMapLocationId] = useState(initialLocations[0].id);
  const [selectedUserId, setSelectedUserId] = useState("organizer-demo");
  const [activeApplicantId, setActiveApplicantId] = useState<string | null>(null);
  const [applicationsReturnPage, setApplicationsReturnPage] = useState<"detail" | "mine">("detail");
  const [filter, setFilter] = useState("全部");
  const [mineTab, setMineTab] = useState<MineTab>("pendingConfirm");
  const [mineView, setMineView] = useState<"dashboard" | "collection">("dashboard");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [interestOpen, setInterestOpen] = useState(false);
  const [selectedQuick, setSelectedQuick] = useState<string[]>([]);
  const [message, setMessage] = useState("我在南山，可以一起过去。");
  const [submittingInterest, setSubmittingInterest] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"cancel" | "withdraw" | null>(null);
  const [mockDialog, setMockDialog] = useState<"chat" | "sent" | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [form, setForm] = useState<PublishForm>(defaultForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [publishing, setPublishing] = useState(false);
  const [draftHydrated, setDraftHydrated] = useState(false);
  const publishLock = useRef(false);

  useEffect(() => {
    dispatch({ type: "HYDRATE", state: loadPrototypeState() });
    const savedDraft = loadPublishDraft();
    if (savedDraft) {
      const destinationIds = savedDraft.destinationIds.filter((id) => publishDestinations.some((item) => item.id === id));
      setForm({ ...savedDraft, destinationIds });
    }
    setDraftHydrated(true);
    setHydrated(true);
  }, []);
  useEffect(() => { if (hydrated) savePrototypeState(state); }, [state, hydrated]);
  useEffect(() => { if (draftHydrated) savePublishDraft(form); }, [form, draftHydrated]);

  const selectedActivity = state.activities.find((activity) => activity.id === selectedActivityId) ?? state.activities[0];
  const selectedLocation = state.locations.find((location) => location.id === selectedLocationId) ?? state.locations[0];
  const selectedUser = state.users.find((user) => user.id === selectedUserId);
  const currentUser = state.users.find((user) => user.id === state.currentUserId);
  const organizer = state.users.find((user) => user.id === selectedActivity.organizerId);
  const participant = getUserParticipant(state, selectedActivity.id);
  const application = getUserApplication(state, selectedActivity.id);
  const currentApplications = state.applications.filter((item) => item.activityId === selectedActivity.id);
  const pendingApplications = currentApplications.filter((item) => item.status === "pending");
  const isOrganizer = selectedActivity.organizerId === state.currentUserId;
  const selectedStatus = effectiveActivityStatus(state, selectedActivity);
  const participants = getActivityParticipants(state, selectedActivity.id);
  const recommendations = useMemo(() => getRecommendations(state), [state]);
  const recommendationById = useMemo(() => new Map(recommendations.map((item) => [item.activity.id, item])), [recommendations]);

  const listActivities = useMemo(() => state.activities.filter((activity) => {
    if (activity.locationId !== selectedLocationId) return false;
    if (filter === "今天") return activity.dateLabel === "今天";
    if (filter === "本周末") return ["本周六", "本周日"].includes(activity.dateLabel);
    if (filter === "轻松") return activity.intensity === "轻松";
    if (filter === "仅看有空位") return ["recruiting", "full"].includes(activity.status) && getParticipantCount(state, activity.id) < activity.capacity;
    return true;
  }), [state, filter, selectedLocationId]);

  const searchResults = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return recommendations.slice(0, 5).map((item) => item.activity);
    return state.activities.filter((activity) => `${activity.title}${activity.category}${activity.tags.join("")}${state.locations.find((item) => item.id === activity.locationId)?.name ?? ""}`.toLowerCase().includes(keyword)).slice(0, 6);
  }, [state, searchQuery, recommendations]);

  const mineCollections = useMemo(() => Object.fromEntries(mineTabs.map((tab) => [tab, getMineActivities(state, tab)])) as Record<MineTab, Activity[]>, [state]);
  const preference = state.preferences.find((item) => item.userId === state.currentUserId) ?? state.preferences[0];
  const [preferenceDraft, setPreferenceDraft] = useState<UserPreference>(preference);
  useEffect(() => { if (preference) setPreferenceDraft(preference); }, [preference]);

  const goDetail = (activity: Activity, from: Page) => { setSelectedActivityId(activity.id); setSelectedLocationId(activity.locationId); setReturnPage(from); dispatch({ type: "RECORD_VIEW", activityId: activity.id }); setPage("detail"); };
  const openProfile = (userId: string, from: Page) => { setSelectedUserId(userId); setReturnPage(from); setPage("profile"); };
  const openLocation = (locationId: typeof selectedLocationId, initialFilter = "全部") => { setSelectedLocationId(locationId); setFilter(initialFilter); setPage("list"); };

  const toggleFavorite = () => { const wasFavorite = isFavorite(state, selectedActivity.id); dispatch({ type: "TOGGLE_FAVORITE", activityId: selectedActivity.id }); toast.success(wasFavorite ? "已取消收藏" : "已加入收藏"); };
  const sendApplication = () => {
    if (!message.trim() && selectedQuick.length === 0) { toast.error("请至少选择一句快捷表达或补充一句话"); return; }
    setSubmittingInterest(true);
    window.setTimeout(() => { dispatch({ type: "APPLY", activityId: selectedActivity.id, quickMessages: selectedQuick, message: message.trim() }); setSubmittingInterest(false); setInterestOpen(false); setMockDialog("sent"); }, 400);
  };
  const acceptApplication = (applicationId: string) => { if (selectedStatus !== "recruiting") { toast.error("当前活动已停止招募"); return; } dispatch({ type: "ACCEPT_APPLICATION", applicationId }); setActiveApplicantId(applicationId); setPage("success"); };

  const updateFormChoice = <K extends keyof PublishForm>(key: K, value: PublishForm[K]) => {
    setForm((current) => {
      const next = { ...current, [key]: value };
      if (["destinationIds", "startDate", "endDate"].includes(key)) {
        const stops = publishDestinations.filter((item) => next.destinationIds.includes(item.id));
        const names = next.destinationIds.map((id) => stops.find((item) => item.id === id)?.name).filter(Boolean);
        const date = next.startDate ? `${Number(next.startDate.slice(5, 7))}月${Number(next.startDate.slice(8, 10))}日` : "这次";
        next.title = names.length > 1 ? `${date}${names[0]}出发的城市漫游` : names.length ? `${date}一起去${names[0]}` : "";
      }
      return next;
    });
    setFormErrors((current) => ({ ...current, [key]: "" }));
  };
  const publish = () => {
    if (publishLock.current || publishing) return;
    const errors: Record<string, string> = {};
    const validDestinationCount = form.destinationIds.filter((id) => publishDestinations.some((item) => item.id === id)).length;
    if (!validDestinationCount) errors.destinationIds = "请选择有效的地点";
    if (!isValidPublishDateRange(form.startDate, form.endDate)) errors.dateRange = form.startDate && form.startDate < localDateValue() ? "出发日期已过期，请重新选择" : "请选择有效的出游日期";
    if (!form.photos.length) errors.photos = "请至少添加一张照片";
    if (!form.description.trim()) errors.description = "请写下这次旅行的介绍";
    if (!form.title.trim()) errors.title = "标题不能为空";
    setFormErrors(errors);
    if (Object.keys(errors).length) { toast.error("请先完成必填信息"); return; }
    publishLock.current = true;
    setPublishing(true);
    window.setTimeout(() => { dispatch({ type: "PUBLISH_ACTIVITY", form }); publishLock.current = false; setPublishing(false); clearPublishDraft(); setForm({ ...defaultForm, destinationIds: [], photos: [], notices: [] }); setFormErrors({}); setStyleOpen(false); setMineTab("published"); setMineView("collection"); setPage("mine"); toast.success("计划发布成功"); }, 450);
  };
  const clearCurrentDraft = () => { clearPublishDraft(); setForm({ ...defaultForm, destinationIds: [], photos: [], notices: [] }); setFormErrors({}); setStyleOpen(false); toast.success("发布草稿已清空"); };
  const reset = () => { clearPrototypeState(); setForm({ ...defaultForm, destinationIds: [], photos: [], notices: [] }); dispatch({ type: "RESET", state: createInitialState() }); setSelectedActivityId("wutong-sunset"); setPage("discover"); toast.success("V2 Mock 数据已重置"); };

  const activeApplicant = state.applications.find((item) => item.id === activeApplicantId);
  const activeApplicantUser = state.users.find((user) => user.id === activeApplicant?.userId);
  const currentRecommendation = recommendationById.get(selectedActivity.id);
  const primaryAction = getPrimaryAction(selectedStatus, application?.status, participant?.status);

  return <main className="prototype-stage"><div className="phone-shell"><div className="phone-status"><span>9:41</span><span>● ︵ ▰</span></div><div className="screen">
    {page === "discover" && <DiscoverPage state={state} recommendations={recommendations} selectedMarker={selectedMapLocationId} onSelectMarker={setSelectedMapLocationId} onSearch={() => setSearchOpen(true)} onLocation={openLocation} onPreference={() => setPage("preference")} onDetail={(activity) => goDetail(activity, "discover")} />}
    {page === "list" && <section className="page scroll-page"><TopBar title={selectedLocation.name} onBack={() => setPage("discover")} /><div className="content-pad list-intro"><span className="eyebrow">{selectedLocation.district}</span><h1>{selectedLocation.name}</h1><p>{getLocationPlanCount(state, selectedLocation.id)} 个可查看计划 · 当前展示 {listActivities.length} 个</p></div><div className="chip-scroll sticky-chips">{["全部", "今天", "本周末", "轻松", "仅看有空位"].map((item) => <button className={`chip ${filter === item ? "active" : ""}`} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="card-list content-pad">{listActivities.map((activity) => <ActivityCard state={state} key={activity.id} activity={activity} recommendation={recommendationById.get(activity.id)} onClick={() => goDetail(activity, "list")} />)}{listActivities.length === 0 && <EmptyState title="没有符合条件的计划" text="换一个筛选条件再看看。"><Button variant="outline" onClick={() => setFilter("全部")}>清除筛选</Button></EmptyState>}</div></section>}
    {page === "detail" && <DetailPage state={state} activity={selectedActivity} status={selectedStatus} organizer={organizer} participant={participant} participants={participants} isOrganizer={isOrganizer} recommendation={currentRecommendation} pendingCount={pendingApplications.length} primaryAction={primaryAction} onBack={() => setPage(returnPage)} onFavorite={toggleFavorite} onProfile={(id) => openProfile(id, "detail")} onApplications={() => { setApplicationsReturnPage("detail"); setPage("applications"); }} onPreparation={() => setPage("preparation")} onApply={() => setInterestOpen(true)} onCancel={() => setConfirmAction("cancel")} onWithdraw={() => setConfirmAction("withdraw")} />}
    {page === "publish" && <PublishPage form={form} errors={formErrors} styleOpen={styleOpen} publishing={publishing} onBack={() => { if (hasPublishDraft(form)) toast.info("草稿已自动保留"); setPage("discover"); }} onClearDraft={clearCurrentDraft} onStyle={() => setStyleOpen(!styleOpen)} onChange={updateFormChoice} onPublish={publish} />}
    {page === "applications" && <ApplicationsPage state={state} activity={selectedActivity} applications={currentApplications} pendingCount={pendingApplications.length} status={selectedStatus} onBack={() => setPage(applicationsReturnPage)} onProfile={(id) => openProfile(id, "applications")} onAccept={acceptApplication} onReject={(id) => dispatch({ type: "REJECT_APPLICATION", applicationId: id })} />}
    {page === "success" && <SuccessPage state={state} activity={selectedActivity} user={activeApplicantUser} onClose={() => setPage("detail")} onPreparation={() => setPage("preparation")} />}
    {page === "preparation" && <PreparationPage state={state} activity={selectedActivity} participant={participant} participants={participants} isOrganizer={isOrganizer} onBack={() => setPage("detail")} onProfile={(id) => openProfile(id, "preparation")} onConfirm={() => { dispatch({ type: "CONFIRM_PARTICIPATION", activityId: selectedActivity.id }); toast.success("已确认参加"); }} onChat={() => setMockDialog("chat")} onWithdraw={() => setConfirmAction("withdraw")} />}
    {page === "profile" && selectedUser && <ProfilePage user={selectedUser} onBack={() => setPage(returnPage)} />}
    {page === "preference" && preferenceDraft && <PreferencePage draft={preferenceDraft} onBack={() => { setMineView("dashboard"); setPage("mine"); }} onChange={setPreferenceDraft} onSave={() => { if (!preferenceDraft.categories.length || !preferenceDraft.availableTimes.length) { toast.error("请至少选择 1 个活动和 1 个常见时间"); return; } dispatch({ type: "SAVE_PREFERENCE", preference: { ...preferenceDraft, updatedAt: new Date().toISOString() } }); toast.success("偏好已保存，推荐已更新"); setPage("discover"); }} />}
    {page === "mine" && (mineView === "dashboard" ? <MinePage state={state} currentUser={currentUser} preference={preference} collections={mineCollections} onCollection={(tab) => { setMineTab(tab); setMineView("collection"); }} onProfile={() => openProfile(state.currentUserId, "mine")} onPreference={() => setPage("preference")} onApplications={(activity) => { setSelectedActivityId(activity.id); setReturnPage("mine"); setApplicationsReturnPage("mine"); setPage("applications"); }} onActivity={(activity) => { if (activity.status === "preparing" && getUserParticipant(state, activity.id)) { setSelectedActivityId(activity.id); setReturnPage("mine"); setPage("preparation"); } else goDetail(activity, "mine"); }} /> : <MineCollectionPage state={state} tab={mineTab} collections={mineCollections} onBack={() => setMineView("dashboard")} onPublish={() => setPage("publish")} onActivity={(activity) => { if (["pendingConfirm", "upcoming"].includes(mineTab) && activity.status === "preparing") { setSelectedActivityId(activity.id); setReturnPage("mine"); setPage("preparation"); } else goDetail(activity, "mine"); }} />)}
  </div>
  {!['success', 'publish'].includes(page) && <BottomTabs page={page} onChange={(nextPage) => { if (nextPage === "mine") setMineView("dashboard"); setPage(nextPage); }} />}
  {page !== "publish" && <button className="debug-fab" aria-label="打开原型测试面板" onClick={() => setDebugOpen(!debugOpen)}><Bug size={18} /></button>}
  {page !== "publish" && debugOpen && <DebugPanel state={state} activity={selectedActivity} onClose={() => setDebugOpen(false)} onReset={reset} onStatus={(status) => dispatch({ type: "SET_ACTIVITY_STATUS", activityId: selectedActivity.id, status })} onParticipant={(status) => dispatch({ type: "SET_PARTICIPANT_STATUS", activityId: selectedActivity.id, status })} onRole={(role) => dispatch({ type: "SET_ROLE", role })} onAddApplication={() => { dispatch({ type: "ADD_DEBUG_APPLICATION", activityId: selectedActivity.id }); toast.success("已生成一条待处理申请"); }} onClearBehaviors={() => { dispatch({ type: "CLEAR_BEHAVIORS" }); toast.success("当前用户行为数据已清空"); }} onRegenerate={() => toast.success("推荐已根据当前偏好重新计算")} />}
  </div>

  <Sheet open={interestOpen} onOpenChange={setInterestOpen}><SheetContent side="bottom" className="interest-sheet"><SheetHeader><SheetTitle>和发起人打个招呼</SheetTitle><SheetDescription>快捷表达和补充文字会一起发送给发起人。</SheetDescription></SheetHeader><div className="sheet-body"><div className="quick-grid">{quickMessages.map((item) => <button key={item} className={selectedQuick.includes(item) ? "selected" : ""} onClick={() => setSelectedQuick((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])}>{selectedQuick.includes(item) && <Check size={15} />}{item}</button>)}</div><label className="field"><span>补充一句</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} /></label></div><SheetFooter><Button size="lg" onClick={sendApplication} disabled={submittingInterest}><Send />{submittingInterest ? "发送中…" : "发送申请"}</Button></SheetFooter></SheetContent></Sheet>
  <Sheet open={searchOpen} onOpenChange={setSearchOpen}><SheetContent side="bottom" className="interest-sheet search-sheet"><SheetHeader><SheetTitle>搜索地点或活动</SheetTitle><SheetDescription>输入地点、活动类型或标签。</SheetDescription></SheetHeader><div className="sheet-body"><label className="search-input"><Search size={18} /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="例如：大鹏、露营、日落" /></label><div className="search-results">{searchResults.map((activity) => <button key={activity.id} onClick={() => { setSearchOpen(false); goDetail(activity, "discover"); }}><span><b>{activity.title}</b><small>{state.locations.find((item) => item.id === activity.locationId)?.name} · {activity.dateLabel}</small></span><ChevronRight size={18} /></button>)}{searchResults.length === 0 && <p>没有找到相关计划，换个地点或关键词试试。</p>}</div></div></SheetContent></Sheet>
  <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}><AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>{confirmAction === "cancel" ? "确认取消这次活动吗？" : "确认退出这次活动吗？"}</AlertDialogTitle><AlertDialogDescription>{confirmAction === "cancel" ? "取消后所有成员会看到活动已取消，申请入口也会关闭。" : "退出后将释放一个名额，并记录一次临时退出。"}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>再想想</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { if (confirmAction === "cancel") dispatch({ type: "CANCEL_ACTIVITY", activityId: selectedActivity.id }); if (confirmAction === "withdraw") dispatch({ type: "WITHDRAW", activityId: selectedActivity.id }); setConfirmAction(null); toast.success(confirmAction === "cancel" ? "活动已取消" : "已退出活动"); }}>{confirmAction === "cancel" ? "确认取消" : "确认退出"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  <AlertDialog open={mockDialog !== null} onOpenChange={(open) => !open && setMockDialog(null)}><AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>{mockDialog === "chat" ? "临时群聊（Mock）" : "申请已发送"}</AlertDialogTitle><AlertDialogDescription>{mockDialog === "chat" ? "V2 原型仍不接入真实聊天，这里只模拟进入临时群聊。" : "发起人接受后，你会成为活动成员，并进入出发准备。"}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={() => setMockDialog(null)}>知道了</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><Toaster position="top-center" /></main>;
}

function DiscoverPage({ state, recommendations, selectedMarker, onSelectMarker, onSearch, onLocation, onPreference, onDetail }: { state: PrototypeState; recommendations: Recommendation[]; selectedMarker: PrototypeState["locations"][number]["id"]; onSelectMarker: (id: PrototypeState["locations"][number]["id"]) => void; onSearch: () => void; onLocation: (id: PrototypeState["locations"][number]["id"], filter?: string) => void; onPreference: () => void; onDetail: (activity: Activity) => void }) {
  const selectedLocation = state.locations.find((location) => location.id === selectedMarker);
  const locationRecommendations = recommendations.filter((item) => item.activity.locationId === selectedMarker);

  return <section className="page map-page"><header className="map-header"><div><span className="eyebrow">当前城市</span><strong>深圳 <span aria-hidden>⌄</span></strong></div><button className="search-pill" onClick={onSearch}><Search size={18} /><span>搜索地点或活动</span></button></header><div className="chip-scroll"><button className="chip" onClick={() => onLocation("wutong", "本周末")}>本周末</button><button className="chip" onClick={() => onLocation("shenzhen-bay", "仅看有空位")}>附近</button><button className="chip" onClick={() => onLocation("wutong", "轻松")}>轻松活动</button><button className="chip" onClick={onSearch}>更多筛选</button></div><div className="mock-map" aria-label="活动地点地图"><span className="road road-one" /><span className="road road-two" /><span className="water" />{state.locations.filter((location) => location.id !== "futian").map((location) => <button className={`map-marker ${location.markerClass} ${selectedMarker === location.id ? "selected" : ""}`} key={location.id} aria-pressed={selectedMarker === location.id} onClick={() => onSelectMarker(location.id)}><span><MapPin size={14} />{location.name}</span><b>{getLocationPlanCount(state, location.id)}</b><small>{selectedMarker === location.id ? "下方已显示此地计划" : `${location.categoryHint} · 点击查看计划`}</small></button>)}<div className="map-label label-city">深圳市</div><div className="map-label label-sea">大鹏湾</div></div><div className="map-bottom v2-recommendations" aria-live="polite"><div className="section-heading"><div><span className="eyebrow">根据你的偏好 · {selectedLocation?.name ?? "当前地点"}</span><h2>适合你的计划</h2></div><button onClick={onPreference}><Sparkles size={16} />调整偏好</button></div>{locationRecommendations.length > 0 ? <div className="recommendation-scroll">{locationRecommendations.slice(0, 3).map((item) => <button className="featured-card recommendation-card" key={item.activity.id} onClick={() => onDetail(item.activity)}><div className="featured-icon"><Footprints size={25} /></div><div><h3>{item.activity.title}</h3><p>{item.activity.dateLabel} {item.activity.startTime} · {getParticipantCount(state, item.activity.id)}/{item.activity.capacity}人</p><div className="reason-copy"><Sparkles size={12} />{item.reasons[0] ?? "正在招募"}</div></div><ChevronRight size={20} /></button>)}</div> : <div className="recommendation-empty"><span>{selectedLocation?.name ?? "该地点"}暂时没有匹配的可报名计划</span><button onClick={onPreference}>调整偏好</button><button onClick={() => onLocation(selectedMarker)}>查看该地全部</button></div>}</div></section>;
}

function DetailPage({ state, activity, status, organizer, participant, participants, isOrganizer, recommendation, pendingCount, primaryAction, onBack, onFavorite, onProfile, onApplications, onPreparation, onApply, onCancel, onWithdraw }: { state: PrototypeState; activity: Activity; status: ActivityStatus; organizer?: User; participant?: PrototypeState["participants"][number]; participants: PrototypeState["participants"]; isOrganizer: boolean; recommendation?: Recommendation; pendingCount: number; primaryAction: { label: string; enabled: boolean; target: string }; onBack: () => void; onFavorite: () => void; onProfile: (id: string) => void; onApplications: () => void; onPreparation: () => void; onApply: () => void; onCancel: () => void; onWithdraw: () => void }) {
  const budgetText = activity.budgetLabel === "免费" || (activity.budgetMin === 0 && activity.budgetMax === 0) ? "免费" : activity.budgetLabel ?? `${activity.budgetMin}–${activity.budgetMax} 元`;
  const hasExtraPlan = Boolean(activity.routeStops?.length || activity.transport || activity.meetingPoint || activity.notices?.length || activity.extraNotes);
  return <section className="page scroll-page detail-page"><TopBar title="活动详情" onBack={onBack} right={<button className={`icon-button ${isFavorite(state, activity.id) ? "favorite-active" : ""}`} onClick={onFavorite} aria-label="收藏"><Bookmark size={20} fill={isFavorite(state, activity.id) ? "currentColor" : "none"} /></button>} />{status === "cancelled" && <div className="status-banner danger"><AlertCircle size={18} />活动已取消</div>}{status === "completed" && <div className="status-banner">活动已结束</div>}{status === "preparing" && <button className="status-banner preparing-banner" onClick={onPreparation}><CalendarDays size={18} />已进入出发准备，查看成员确认情况<ChevronRight size={17} /></button>}<div className="content-pad detail-hero">{activity.photos && activity.photos.length > 0 && <div className={`detail-photo-grid count-${Math.min(activity.photos.length, 3)}`}>{activity.photos.slice(0, 3).map((photo, index) => <img key={`${photo.slice(0, 20)}-${index}`} src={photo} alt={`${activity.title}照片 ${index + 1}`} />)}</div>}<span className="eyebrow">{activity.category} · {eventStatusLabel(status)}</span><h1>{activity.title}</h1><div className="facts-grid"><div><CalendarDays /><span><small>时间</small>{activity.dateLabel}<br />{activity.date !== activity.endDate && activity.endDate ? `${activity.startTime} 出发 · 返程待定` : `${activity.startTime}–${activity.endTime}`}{activity.flexibleDates && <em className="flexible-date-note">日期可灵活</em>}</span></div><div><MapPin /><span><small>地点</small>{activity.routeStops?.[0] ?? state.locations.find((item) => item.id === activity.locationId)?.name}</span></div><div><Users /><span><small>人数</small>{getParticipantCount(state, activity.id)} / {activity.capacity} 人</span></div><div><span className="fact-symbol">¥</span><span><small>预算</small>{budgetText}</span></div></div></div><div className="detail-section"><h2>这个局适不适合你</h2><div className="tag-row large"><Tag accent>{activity.intensity}节奏</Tag>{activity.socialStyle && <Tag>{activity.socialStyle}</Tag>}{activity.photoStyle && <Tag>{activity.photoStyle}</Tag>}{activity.spendingStyle && <Tag>{activity.spendingStyle}</Tag>}</div></div>{recommendation && <div className="detail-section recommendation-box"><h2><Sparkles size={18} />为什么推荐给你</h2>{recommendation.reasons.map((reason) => <p key={reason}><Check size={16} />{reason}</p>)}</div>}<div className="detail-section"><h2>计划说明</h2><p>{activity.description}</p></div>{hasExtraPlan && <div className="detail-section plan-extra-detail"><h2>行程安排</h2>{activity.routeStops && activity.routeStops.length > 0 && <div className="detail-route-list">{activity.routeStops.map((stop, index) => <span key={`${stop}-${index}`}><i>{index + 1}</i>{stop}</span>)}</div>}<div className="plan-extra-grid">{activity.transport && <p><Footprints /><span><small>交通方式</small>{activity.transport}</span></p>}{activity.meetingPoint && <p><MapPin /><span><small>集合地点</small>{activity.meetingPoint}</span></p>}</div>{activity.notices && activity.notices.length > 0 && <div className="tag-row large">{activity.notices.map((notice) => <Tag key={notice}>{notice}</Tag>)}</div>}{activity.extraNotes && <p className="extra-plan-note">{activity.extraNotes}</p>}</div>}<button className="detail-section organizer-profile" onClick={() => onProfile(activity.organizerId)}><Avatar user={organizer} /><span><small>发起人</small><b>{organizer?.name}</b><em><ShieldCheck size={14} />履约率 {organizer?.fulfillmentRate}%</em></span><ChevronRight /></button><div className="detail-section"><div className="section-heading compact"><h2>同行成员</h2><span>{getConfirmedCount(state, activity.id)} 人已确认</span></div><div className="people-row">{participants.map((item) => { const user = state.users.find((candidate) => candidate.id === item.userId); return <button key={item.userId} onClick={() => onProfile(item.userId)}><Avatar user={user} /><b>{user?.name}</b><small>{participantStatusLabel(item.status)}</small></button>; })}</div></div>{isOrganizer && pendingCount > 0 && <button className="application-entry" onClick={onApplications}><span><b>{pendingCount} 人等待你的确认</b><small>查看并处理搭子申请</small></span><ChevronRight /></button>}{(isOrganizer || participant) && <div className="detail-management">{isOrganizer && !["cancelled", "completed"].includes(status) && <button onClick={onCancel}>取消活动</button>}{participant && !isOrganizer && ["joined", "confirmed"].includes(participant.status) && <button onClick={onWithdraw}>退出活动</button>}</div>}<div className="bottom-spacer" /><div className="bottom-action">{isOrganizer ? <><Button variant="outline" size="lg" onClick={onApplications} disabled={["cancelled", "completed"].includes(status)}><Users />查看申请</Button><Button size="lg" onClick={onPreparation}><CalendarDays />出发准备</Button></> : <><Button variant="outline" size="lg" onClick={onFavorite}><Bookmark fill={isFavorite(state, activity.id) ? "currentColor" : "none"} />{isFavorite(state, activity.id) ? "已收藏" : "收藏"}</Button><Button size="lg" disabled={!primaryAction.enabled} onClick={() => primaryAction.target === "apply" ? onApply() : primaryAction.target === "preparation" && onPreparation()}>{primaryAction.label}</Button></>}</div></section>;
}

function PublishPage({ form, errors, styleOpen, publishing, onBack, onClearDraft, onStyle, onChange, onPublish }: { form: PublishForm; errors: Record<string, string>; styleOpen: boolean; publishing: boolean; onBack: () => void; onClearDraft: () => void; onStyle: () => void; onChange: <K extends keyof PublishForm>(key: K, value: PublishForm[K]) => void; onPublish: () => void }) {
  const [step, setStep] = useState<"destination" | "details" | "preview">("destination");
  const [search, setSearch] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [draftStart, setDraftStart] = useState(form.startDate);
  const [draftEnd, setDraftEnd] = useState(form.endDate);
  const [draftFlexible, setDraftFlexible] = useState(form.flexibleDates);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({});
  const minimumDate = localDateValue();
  const selectedDestinations = form.destinationIds.map((id) => publishDestinations.find((item) => item.id === id)).filter(Boolean) as Array<(typeof publishDestinations)[number]>;
  const query = search.trim().toLowerCase();
  const searchResults = publishDestinations.filter((item) => !form.destinationIds.includes(item.id) && (!query || `${item.name}${item.meta}`.toLowerCase().includes(query)));
  const allErrors = { ...errors, ...localErrors };
  const displayedDateError = allErrors.dateRange || (form.startDate && form.startDate < minimumDate ? "出发日期已过期，请重新选择" : "");
  const validFirstStep = selectedDestinations.length > 0 && selectedDestinations.length === form.destinationIds.length && isValidPublishDateRange(form.startDate, form.endDate);
  const validDraftDates = isValidPublishDateRange(draftStart, draftEnd);

  const updateDestinations = (next: string[]) => { onChange("destinationIds", next); setLocalErrors((current) => ({ ...current, destinationIds: "" })); };
  const addDestination = (id: string) => {
    if (form.destinationIds.length >= 3) { toast.info("最多选择 3 个地点"); return; }
    updateDestinations([...form.destinationIds, id]);
  };
  const moveDestination = (index: number, offset: number) => {
    const target = index + offset;
    if (target < 0 || target >= form.destinationIds.length) return;
    const next = [...form.destinationIds];
    [next[index], next[target]] = [next[target], next[index]];
    updateDestinations(next);
  };
  const openDates = () => { setDraftStart(form.startDate); setDraftEnd(form.endDate); setDraftFlexible(form.flexibleDates); setLocalErrors((current) => ({ ...current, dateRange: "" })); setDateOpen(true); };
  const confirmDates = () => {
    if (!draftStart || !draftEnd) { setLocalErrors((current) => ({ ...current, dateRange: "请选择开始和结束日期" })); return; }
    if (draftStart < minimumDate) { setLocalErrors((current) => ({ ...current, dateRange: "出发日期已过期，请重新选择" })); return; }
    if (draftEnd < draftStart) { setLocalErrors((current) => ({ ...current, dateRange: "结束日期不能早于开始日期" })); return; }
    onChange("startDate", draftStart); onChange("endDate", draftEnd); onChange("flexibleDates", draftFlexible); setLocalErrors((current) => ({ ...current, dateRange: "" })); setDateOpen(false);
  };
  const goDetails = () => {
    const next: Record<string, string> = {};
    if (!selectedDestinations.length || selectedDestinations.length !== form.destinationIds.length) next.destinationIds = "请至少选择一个有效地点";
    if (!isValidPublishDateRange(form.startDate, form.endDate)) next.dateRange = form.startDate && form.startDate < minimumDate ? "出发日期已过期，请重新选择" : "请选择有效的出游日期";
    setLocalErrors(next);
    if (!Object.keys(next).length) setStep("details");
  };
  const readPhotos = async (files: FileList | null) => {
    if (!files?.length || uploadingPhotos) return;
    const slots = 3 - form.photos.length;
    const allFiles = Array.from(files);
    const imageFiles = allFiles.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length !== allFiles.length) toast.info("已忽略非图片文件");
    const chosen = imageFiles.slice(0, slots);
    if (imageFiles.length > slots) toast.info("最多上传 3 张照片");
    const oversized = chosen.filter((file) => file.size > 8 * 1024 * 1024);
    if (oversized.length) toast.info("单张照片请小于 8MB");
    const accepted = chosen.filter((file) => file.size <= 8 * 1024 * 1024);
    if (!accepted.length) return;
    setUploadingPhotos(true);
    const results = await Promise.allSettled(accepted.map((file) => compressPhoto(file)));
    const urls = results.filter((result): result is PromiseFulfilledResult<string> => result.status === "fulfilled").map((result) => result.value);
    if (urls.length) { onChange("photos", [...form.photos, ...urls].slice(0, 3)); setLocalErrors((current) => ({ ...current, photos: "" })); }
    if (urls.length !== accepted.length) toast.error("部分照片读取失败，请换图重试");
    setUploadingPhotos(false);
  };
  const goPreview = () => {
    const next: Record<string, string> = {};
    if (!form.photos.length) next.photos = "请至少添加一张旅行照片";
    if (!form.description.trim()) next.description = "请写下这次旅行的介绍";
    if (!validFirstStep) next.dateRange = "地点或日期已失效，请返回检查";
    setLocalErrors(next);
    if (!validFirstStep) { toast.error("地点或日期已失效，请重新检查"); setStep("destination"); return; }
    if (!Object.keys(next).length) {
      if (!form.title.trim() && selectedDestinations[0]) onChange("title", `${Number(form.startDate.slice(5, 7))}月${Number(form.startDate.slice(8, 10))}日一起去${selectedDestinations[0].name}`);
      setStep("preview");
    }
  };
  const handleBack = () => { if (uploadingPhotos) { toast.info("照片正在处理，请稍候"); return; } if (step === "preview") setStep("details"); else if (step === "details") setStep("destination"); else onBack(); };
  const dateText = form.startDate && form.endDate ? `${form.startDate.replaceAll("-", ".")} - ${form.endDate.replaceAll("-", ".")}` : "开始日期–结束日期";

  return <section className="page scroll-page publish-wizard">
    <header className="publish-back"><button className="icon-button" onClick={handleBack} aria-label="返回"><ArrowLeft /></button><span>{step === "destination" ? "1/3" : step === "details" ? "2/3" : "3/3"}</span>{step === "destination" && hasPublishDraft(form) && <button className="clear-publish-draft" onClick={() => setClearConfirmOpen(true)}>清空草稿</button>}</header>
    {step === "destination" && <>
      <div className="publish-step content-pad"><h1>你想去哪里？</h1><div className="publish-search"><Search /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="输入地点名称" />{search && <button onClick={() => setSearch("")} aria-label="清空搜索"><X /></button>}</div>
        {selectedDestinations.length > 0 && <><div className="selected-place-tags">{selectedDestinations.map((item) => <button key={item.id} aria-label={`移除${item.name}`} onClick={() => updateDestinations(form.destinationIds.filter((id) => id !== item.id))}>{item.name}<X /></button>)}</div><div className="route-heading"><b>选择想去的地点</b><small>用上下按钮安排路线</small></div><div className="route-list">{selectedDestinations.map((item, index) => <article className="route-stop" key={item.id}><span className="route-index">{index + 1}</span><span className={`place-thumb tone-${item.tone}`}><MapPin /></span><span><b>{item.name}</b><small>{item.meta}</small></span><div className="route-order"><button onClick={() => moveDestination(index, -1)} disabled={index === 0} aria-label={`${item.name}上移`}><ArrowUp /></button><button onClick={() => moveDestination(index, 1)} disabled={index === selectedDestinations.length - 1} aria-label={`${item.name}下移`}><ArrowDown /></button></div></article>)}</div></>}
        <div className="place-results">{searchResults.slice(0, query ? 5 : 3).map((item) => <article key={item.id}><span className={`place-thumb tone-${item.tone}`}><MapPin /></span><span><b>{item.name}</b><small>{item.meta}</small></span><button disabled={form.destinationIds.length >= 3} onClick={() => addDestination(item.id)} aria-label={form.destinationIds.length >= 3 ? "已达到地点上限" : `添加${item.name}`}><Plus /></button></article>)}{searchResults.length === 0 && <div className="publish-empty"><MapPin /><b>没有找到相关地点</b><button onClick={() => setSearch("")}>查看推荐地点</button></div>}</div>
        {allErrors.destinationIds && <p className="publish-error">{allErrors.destinationIds}</p>}
        <h1 className="duration-title">你想去多久？</h1><button className={`date-range-trigger ${displayedDateError ? "has-error" : ""}`} onClick={openDates}><CalendarDays /><span>{dateText}</span><ChevronRight /></button>{displayedDateError && <p className="publish-error">{displayedDateError}</p>}
      </div><div className="publish-fixed-action"><Button size="lg" onClick={goDetails} disabled={!validFirstStep}>下一步</Button></div>
    </>}
    {step === "details" && <><div className="publish-step content-pad"><h1>这次准备怎么玩？</h1><p className="publish-subtitle">上传照片，和大家分享这次旅行的亮点吧</p>
      <section className={`publish-panel ${allErrors.photos ? "panel-error" : ""}`}><div className="publish-label"><b>上传照片 <em>*</em></b><small>至少 1 张，首图将作为封面</small></div><div className="photo-grid">{form.photos.map((photo, index) => <div className="photo-item" key={`${photo.slice(0, 20)}-${index}`}><img src={photo} alt={`旅行照片 ${index + 1}`} />{index === 0 && <b>封面</b>}<button disabled={uploadingPhotos} onClick={() => onChange("photos", form.photos.filter((_, itemIndex) => itemIndex !== index))} aria-label={`删除第 ${index + 1} 张照片`}><X /></button></div>)}{form.photos.length < 3 && <label className={`photo-add ${uploadingPhotos ? "disabled" : ""}`}><ImagePlus /><span>{uploadingPhotos ? "处理中…" : "添加照片"}</span>{!uploadingPhotos && <input type="file" accept="image/*" multiple onChange={(event) => { void readPhotos(event.target.files); event.target.value = ""; }} />}</label>}</div>{allErrors.photos && <p className="publish-error">{allErrors.photos}</p>}</section>
      <section className={`publish-panel ${allErrors.description ? "panel-error" : ""}`}><label className="publish-label" htmlFor="trip-description"><b>写下这次旅行的介绍 <em>*</em></b></label><textarea id="trip-description" className="publish-textarea" value={form.description} maxLength={500} onChange={(event) => { onChange("description", event.target.value); setLocalErrors((current) => ({ ...current, description: "" })); }} placeholder="分享一下这次旅行的亮点吧～&#10;比如：这趟行程有什么特别之处？可以做什么、适合谁、有什么小贴士？" /><div className="field-count">{allErrors.description && <span className="publish-error">{allErrors.description}</span>}<small>{form.description.length}/500</small></div></section>
      <section className="publish-panel optional-panel"><button className="optional-toggle" onClick={onStyle}><span><WalletCards /><span><b>更多补充说明（选填）</b><small>交通方式、预算、注意事项等</small></span></span><ChevronDown className={styleOpen ? "rotated" : ""} /></button>{styleOpen && <div className="optional-fields"><PublishChips label="交通方式" options={["步行", "自驾", "地铁", "打车", "公交"] as TransportMode[]} value={form.transport ? [form.transport] : []} onChange={(values) => onChange("transport", values.at(-1) ?? "")} /><PublishChips label="预算" options={["免费", "50内", "50-100", "100+"] as BudgetLabel[]} value={form.budgetLabel ? [form.budgetLabel] : []} onChange={(values) => onChange("budgetLabel", values.at(-1) ?? "")} /><label className="optional-input"><b><MapPin /> 集合方式 / 地点</b><input value={form.meetingPoint} maxLength={60} onChange={(event) => onChange("meetingPoint", event.target.value)} placeholder="例如：地铁站 A 口集合" /></label><PublishChips label="注意事项" options={["怕晒", "带水", "穿舒服鞋", "可带朋友"]} value={form.notices} multi onChange={(values) => onChange("notices", values)} /><label className="optional-input"><b><MessageCircle /> 其他补充</b><textarea value={form.extraNotes} maxLength={200} onChange={(event) => onChange("extraNotes", event.target.value)} placeholder="例如：如果你也喜欢拍照、慢慢逛，欢迎一起～" /><small>{form.extraNotes.length}/200</small></label></div>}</section>
      </div><div className="publish-fixed-action"><Button size="lg" onClick={goPreview} disabled={!form.photos.length || !form.description.trim()}>预览计划</Button></div></>}
    {step === "preview" && <><div className="publish-step content-pad preview-step"><span className="preview-kicker">发布前确认</span><h1>{form.title}</h1>{form.photos.length > 0 && <div className="preview-photo-grid">{form.photos.map((photo, index) => <div key={`${photo.slice(0, 20)}-${index}`}><img src={photo} alt={`计划照片 ${index + 1}`} />{index === 0 && <b>封面</b>}</div>)}</div>}<section className="preview-card"><h2>路线与时间</h2><div className="preview-route">{selectedDestinations.map((item, index) => <span key={item.id}><i>{index + 1}</i>{item.name}</span>)}</div><p><CalendarDays />{dateText}{form.flexibleDates && <small>日期可灵活</small>}</p></section><section className="preview-card"><h2>这次怎么玩</h2><p className="preview-description">{form.description}</p>{[form.transport, form.budgetLabel, form.meetingPoint, ...form.notices].some(Boolean) && <div className="preview-tags">{form.transport && <Tag>{form.transport}</Tag>}{form.budgetLabel && <Tag>{form.budgetLabel}</Tag>}{form.meetingPoint && <Tag>{form.meetingPoint}</Tag>}{form.notices.map((item) => <Tag key={item}>{item}</Tag>)}</div>}{form.extraNotes && <p className="preview-note">{form.extraNotes}</p>}</section><button className="edit-plan" onClick={() => setStep("details")}>返回修改</button></div><div className="publish-fixed-action"><Button size="lg" onClick={onPublish} disabled={publishing}>{publishing ? "发布中…" : "确认发布"}</Button></div></>}
    <Sheet open={dateOpen} onOpenChange={setDateOpen}><SheetContent side="bottom" className="interest-sheet date-sheet"><SheetHeader><SheetTitle>你想去多久？</SheetTitle><SheetDescription>时区：北京时间 GMT +8:00</SheetDescription></SheetHeader><div className="date-sheet-body"><label><span>开始日期</span><input type="date" min={minimumDate} value={draftStart} onChange={(event) => { setDraftStart(event.target.value); if (!draftEnd || draftEnd < event.target.value) setDraftEnd(event.target.value); setLocalErrors((current) => ({ ...current, dateRange: "" })); }} /></label><label><span>结束日期</span><input type="date" min={draftStart || minimumDate} value={draftEnd} onChange={(event) => { setDraftEnd(event.target.value); setLocalErrors((current) => ({ ...current, dateRange: "" })); }} /></label><label className="flexible-toggle"><span><b>灵活天数</b><small>日期前后可协调</small></span><input type="checkbox" checked={draftFlexible} onChange={(event) => setDraftFlexible(event.target.checked)} /></label>{allErrors.dateRange && <p className="publish-error">{allErrors.dateRange}</p>}</div><SheetFooter><Button onClick={confirmDates} disabled={!validDraftDates}>确定</Button></SheetFooter></SheetContent></Sheet>
    <AlertDialog open={clearConfirmOpen} onOpenChange={setClearConfirmOpen}><AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>清空这份发布草稿？</AlertDialogTitle><AlertDialogDescription>已选地点、日期、照片和填写内容都会被删除，且无法恢复。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>继续编辑</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { setClearConfirmOpen(false); onClearDraft(); }}>确认清空</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </section>;
}

function compressPhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read_failed"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("decode_failed"));
      image.onload = () => {
        const maxSide = 1200;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) { reject(new Error("canvas_failed")); return; }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.76));
      };
      image.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function PublishChips<T extends string>({ label, options, value, multi = false, onChange }: { label: string; options: readonly T[]; value: T[]; multi?: boolean; onChange: (values: T[]) => void }) {
  const toggle = (option: T) => { if (value.includes(option)) onChange(value.filter((item) => item !== option)); else onChange(multi ? [...value, option] : [option]); };
  return <fieldset className="publish-chip-field"><legend>{label}</legend><div>{options.map((option) => <button type="button" key={option} className={value.includes(option) ? "selected" : ""} onClick={() => toggle(option)}>{option}</button>)}</div></fieldset>;
}

function ApplicationsPage({ state, activity, applications, pendingCount, status, onBack, onProfile, onAccept, onReject }: { state: PrototypeState; activity: Activity; applications: PrototypeState["applications"]; pendingCount: number; status: ActivityStatus; onBack: () => void; onProfile: (id: string) => void; onAccept: (id: string) => void; onReject: (id: string) => void }) {
  return <section className="page scroll-page"><TopBar title="搭子申请" onBack={onBack} /><div className="content-pad applications-intro"><span className="eyebrow">{activity.title}</span><h1>{pendingCount} 人等待确认</h1><p>接受后会创建独立成员记录，进入出发准备。</p></div><div className="card-list content-pad">{applications.map((item) => { const user = state.users.find((candidate) => candidate.id === item.userId); return <article className="application-card" key={item.id}><button className="applicant-head" onClick={() => onProfile(item.userId)}><Avatar user={user} /><div><h2>{user?.name} <small>{user?.age} 岁</small></h2><p>参加 {user?.joinedCount} 次 · 履约率 {user?.fulfillmentRate}%</p></div><ChevronRight /></button>{item.quickMessages.length > 0 && <div className="tag-row application-tags">{item.quickMessages.map((text) => <Tag key={text}>{text}</Tag>)}</div>}<blockquote>“{item.message || "没有补充文字"}”</blockquote><div className="application-actions"><Button variant="outline" disabled={item.status !== "pending" || !["recruiting", "full"].includes(status)} onClick={() => onReject(item.id)}>{item.status === "rejected" ? "已婉拒" : "暂不合适"}</Button><Button disabled={item.status !== "pending" || !["recruiting", "full"].includes(status)} onClick={() => onAccept(item.id)}>{item.status === "accepted" ? <><Check />已加入</> : item.status === "pending" ? "一起去" : "已处理"}</Button></div></article>; })}{applications.length === 0 && <EmptyState title="暂时还没有申请" text="有人表达兴趣后会出现在这里。" />}</div></section>;
}

function SuccessPage({ state, activity, user, onClose, onPreparation }: { state: PrototypeState; activity: Activity; user?: User; onClose: () => void; onPreparation: () => void }) {
  return <section className="page success-page"><button className="success-close" onClick={onClose} aria-label="关闭"><X /></button><div className="success-mark"><Check size={38} /></div><span className="eyebrow">双向确认完成</span><h1>已加入计划</h1><p>{user ? `${user.name} 已经成为同行成员。` : "你已经成为这次出行的成员。"}</p><div className="success-card"><div className="success-route"><span>{activity.dateLabel}</span><div /><span>{state.locations.find((item) => item.id === activity.locationId)?.name}</span></div><h2>{activity.title}</h2><p>{activityTimeText(activity)} · 当前 {getParticipantCount(state, activity.id)}/{activity.capacity} 人</p><div className="next-step"><CalendarDays /><span><b>下一步：出发准备</b><small>成员需要在出发前确认参加</small></span></div></div><div className="success-actions"><Button size="lg" onClick={onPreparation}><CalendarDays />进入出发准备</Button><Button variant="outline" size="lg" onClick={onClose}>查看计划</Button></div></section>;
}

function PreparationPage({ state, activity, participant, participants, isOrganizer, onBack, onProfile, onConfirm, onChat, onWithdraw }: { state: PrototypeState; activity: Activity; participant?: PrototypeState["participants"][number]; participants: PrototypeState["participants"]; isOrganizer: boolean; onBack: () => void; onProfile: (id: string) => void; onConfirm: () => void; onChat: () => void; onWithdraw: () => void }) {
  return <section className="page scroll-page preparation-page"><TopBar title="出发准备" onBack={onBack} /><div className="preparation-hero content-pad"><span className="eyebrow">{departureCountdown(activity.date)}</span><h1>{activity.title}</h1><div className="preparation-facts"><span><CalendarDays />{activity.dateLabel} {activityTimeText(activity)}</span><span><MapPin />{state.locations.find((item) => item.id === activity.locationId)?.name}</span></div></div><div className="detail-section"><div className="section-heading compact"><h2>当前成员</h2><span>{getConfirmedCount(state, activity.id)} / {getParticipantCount(state, activity.id)} 人已确认</span></div><div className="member-list">{participants.map((item) => { const user = state.users.find((candidate) => candidate.id === item.userId); return <button key={item.userId} onClick={() => onProfile(item.userId)}><Avatar user={user} /><span><b>{user?.name}{item.userId === activity.organizerId && <small> 发起人</small>}</b><em className={`member-status status-${item.status}`}>{participantStatusLabel(item.status)}</em></span><ChevronRight /></button>; })}</div></div><div className="preparation-note"><ShieldCheck /><span><b>确认参加不是报名成功</b><small>请在确定能够到场后再确认，临时有事也可以退出。</small></span></div><div className="preparation-actions">{participant?.status === "joined" && <Button size="lg" onClick={onConfirm}><Check />确认参加</Button>}{participant?.status === "confirmed" && <Button size="lg" disabled><Check />已确认参加</Button>}<Button variant="outline" onClick={onChat}><MessageCircle />联系大家</Button>{participant && !isOrganizer && ["joined", "confirmed"].includes(participant.status) && <button className="text-danger" onClick={onWithdraw}>临时有事，退出活动</button>}</div></section>;
}

function ProfilePage({ user, onBack }: { user: User; onBack: () => void }) {
  return <section className="page scroll-page"><TopBar title="出游资料" onBack={onBack} /><div className="profile-hero content-pad"><Avatar user={user} /><div><h1>{user.name} <small>{user.age} 岁</small></h1><p>{user.city} · 轻量出游资料</p></div></div><div className="trust-strip content-pad">{user.verifiedWechat && <span><Check />微信已验证</span>}{user.verifiedPhone && <span><Check />手机号已验证</span>}{user.verifiedIdentity && <span><ShieldCheck />实名认证</span>}</div><div className="detail-section"><h2>出游记录</h2><div className="record-grid"><div><b>{user.joinedCount}</b><span>参加活动</span></div><div><b>{user.organizedCount}</b><span>发起活动</span></div><div><b>{user.completedCount}</b><span>完成出行</span></div></div></div><div className="detail-section"><h2>履约信息</h2><div className="fulfillment-row"><b>{user.fulfillmentRate}%</b><span>履约率<small>近 3 个月临时取消 {user.recentCancellationCount} 次</small></span></div></div><div className="detail-section"><h2>这个人怎么玩</h2><p><b>常去：</b>{user.commonCategories.join(" / ")}</p><p><b>节奏：</b>{user.preferredIntensity}</p><p><b>社交：</b>{user.preferredSocialStyle}</p></div><div className="detail-section"><h2>同行印象</h2><div className="tag-row large">{user.impressionTags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div><small className="privacy-note">来自已完成活动的同行反馈；问题反馈不会公开展示。</small></div></section>;
}

function PreferencePage({ draft, onBack, onChange, onSave }: { draft: UserPreference; onBack: () => void; onChange: (value: UserPreference) => void; onSave: () => void }) {
  return <section className="page scroll-page"><TopBar title="出游偏好" onBack={onBack} /><div className="content-pad publish-intro"><span className="eyebrow">轻量推荐依据</span><h1>你通常喜欢怎么玩？</h1><p>随时可以修改，只用于计划排序和推荐理由。</p></div><div className="form-stack content-pad"><MultiChoice label="喜欢的活动" options={categories} value={draft.categories} max={5} onChange={(value) => onChange({ ...draft, categories: value })} /><MultiChoice label="常见出游时间" options={availableTimes} value={draft.availableTimes} onChange={(value) => onChange({ ...draft, availableTimes: value })} /><ChoiceField label="常见出游距离" options={["附近", "50km 内", "100km 内", "周边城市", "都可以"] as DistancePreference[]} value={draft.distancePreference} onChange={(value) => onChange({ ...draft, distancePreference: value })} /><ChoiceField label="喜欢的节奏" options={["轻松", "正常", "特种兵"] as Intensity[]} value={draft.intensityPreference} onChange={(value) => onChange({ ...draft, intensityPreference: value })} /><ChoiceField label="喜欢的社交程度" options={["各玩各的", "随缘聊天", "热闹一点"] as SocialStyle[]} value={draft.socialPreference} onChange={(value) => onChange({ ...draft, socialPreference: value })} /><Button size="lg" className="wide-button" onClick={onSave}>保存并查看推荐</Button></div></section>;
}

function MinePage({ state, currentUser, preference, collections, onCollection, onProfile, onPreference, onApplications, onActivity }: { state: PrototypeState; currentUser?: User; preference?: UserPreference; collections: Record<MineTab, Activity[]>; onCollection: (tab: MineTab) => void; onProfile: () => void; onPreference: () => void; onApplications: (activity: Activity) => void; onActivity: (activity: Activity) => void }) {
  const [applicationIndex, setApplicationIndex] = useState(0);
  const departingActivities = getMineSectionActivities(state, collections, "pendingConfirm");
  const favoriteActivities = collections.favorites.slice(0, 3);
  const organizedIds = new Set(collections.published.map((activity) => activity.id));
  const pendingApplications = state.applications.filter((application) => application.status === "pending" && organizedIds.has(application.activityId));
  const pendingGroups = collections.published.map((activity) => ({ activity, applications: pendingApplications.filter((application) => application.activityId === activity.id) })).filter((group) => group.applications.length > 0);
  const safeApplicationIndex = Math.min(applicationIndex, Math.max(0, pendingGroups.length - 1));
  const currentPendingGroup = pendingGroups[safeApplicationIndex];
  const nextActivity = [...departingActivities].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`))[0];
  const nextLocation = nextActivity && state.locations.find((location) => location.id === nextActivity.locationId);
  const interestTags = [...new Set([...(preference?.categories ?? []), ...(currentUser?.commonCategories ?? [])])].slice(0, 3);
  const notificationCount = pendingApplications.length + collections.pendingConfirm.length;
  const shortcuts: Array<{ label: string; tab: MineTab; icon: React.ReactNode; accent?: string; badge?: string; badgeCount?: number }> = [
    { label: "我的收藏", tab: "favorites", icon: <Star />, accent: "amber" },
    { label: "待成团", tab: "interested", icon: <Clock3 />, badge: pendingApplications.length ? `待我处理 ${pendingApplications.length}` : undefined },
    { label: "待出行", tab: "pendingConfirm", icon: <BriefcaseBusiness /> },
    { label: "已出行", tab: "history", icon: <Footprints /> },
    { label: "我的计划", tab: "published", icon: <CalendarDays />, accent: "blue", badgeCount: collections.published.length },
  ];

  return <section className="page scroll-page mine-dashboard"><header className="mine-page-header content-pad"><div><span className="eyebrow">个人中心 · {state.debugRole === "participant" ? "参与者" : "发起人"}视角</span><h1>我的</h1></div><div className="mine-header-actions"><button aria-label="通知" onClick={() => currentPendingGroup ? onApplications(currentPendingGroup.activity) : collections.pendingConfirm.length ? onCollection("pendingConfirm") : toast.info("暂无新通知")}><Bell />{notificationCount > 0 && <b>{notificationCount}</b>}</button><button aria-label="我的收藏" onClick={() => onCollection("favorites")}><Star /></button><button aria-label="出游设置" onClick={onPreference}><Settings /></button></div></header><div className="content-pad"><article className="mine-profile-card"><div className="mine-profile-main"><Avatar user={currentUser} /><div className="mine-profile-copy"><h2>{currentUser?.name ?? "搭子"}</h2><p><MapPin />{currentUser?.city ?? "未设置城市"}</p><p><CalendarDays />{availabilityLabel(preference)}</p><button className="mine-interest-tags" onClick={onPreference} aria-label="调整出游偏好">{interestTags.map((tag) => <span key={tag}>{tag}</span>)}</button></div><button className="mine-edit-profile" onClick={onProfile}>查看资料<ChevronRight /></button></div><div className="mine-trust-line"><Users /><span>同行 {currentUser?.joinedCount ?? 0} 次 · {currentUser?.recentCancellationCount ? `近 3 个月临时取消 ${currentUser.recentCancellationCount} 次` : "从未爽约"}</span></div></article></div><div className="mine-shortcuts content-pad">{shortcuts.map((item) => <button className={`mine-shortcut shortcut-${item.accent ?? "neutral"}`} key={item.label} onClick={() => onCollection(item.tab)}>{item.badge && <em>{item.badge}</em>}<span>{item.icon}{Boolean(item.badgeCount) && <b>{item.badgeCount}</b>}</span><small>{item.label}</small></button>)}</div>{currentPendingGroup && <div className="content-pad"><button className="mine-application-banner" onClick={() => onApplications(currentPendingGroup.activity)}><span className="mine-applicant-stack">{currentPendingGroup.applications.slice(0, 3).map((application) => <Avatar key={application.id} user={state.users.find((user) => user.id === application.userId)} />)}</span><span className="mine-banner-copy"><b>{currentPendingGroup.applications.length} 人申请加入你的计划</b><small>{state.locations.find((location) => location.id === currentPendingGroup.activity.locationId)?.name} · 等你确认</small></span><span className="mine-banner-index">{safeApplicationIndex + 1}/{pendingGroups.length}<ChevronRight /></span></button>{pendingGroups.length > 1 && <div className="mine-carousel-dots" aria-label="待处理计划切换">{pendingGroups.map((group, index) => <button className={index === safeApplicationIndex ? "active" : ""} aria-label={`查看第 ${index + 1} 个待处理计划`} onClick={() => setApplicationIndex(index)} key={group.activity.id} />)}</div>}</div>}{nextActivity && <section className="mine-section content-pad"><div className="mine-section-title"><h2>接下来</h2><button onClick={() => onCollection("pendingConfirm")}>查看全部<ChevronRight /></button></div><button className="next-plan-card" onClick={() => onActivity(nextActivity)}><div className={`activity-cover cover-${nextActivity.locationId}`}><span>{nextActivity.category}</span></div><div><h3>{nextActivity.title}</h3><p><Clock3 />{nextActivity.dateLabel} {nextActivity.startTime}</p><p><MapPin />{nextLocation?.name}</p><p><Users />{getParticipantCount(state, nextActivity.id)}/{nextActivity.capacity} 人 · {getUserParticipant(state, nextActivity.id)?.status === "joined" ? "待你确认" : "你已加入"}</p></div><span className="next-plan-action">查看计划</span></button></section>}<section className="mine-section mine-favorites content-pad"><div className="mine-section-title"><h2>我的收藏</h2><button onClick={() => onCollection("favorites")}>查看全部<ChevronRight /></button></div>{favoriteActivities.length > 0 ? <div className="favorite-preview-grid">{favoriteActivities.map((activity) => <button key={activity.id} onClick={() => onActivity(activity)}><div className={`activity-cover cover-${activity.locationId}`}><span>{activity.category}</span></div><b>{activity.title}</b><small><MapPin />{state.locations.find((location) => location.id === activity.locationId)?.name}</small></button>)}</div> : <button className="favorites-empty" onClick={() => onCollection("favorites")}><Star /><span>还没有收藏，去发现喜欢的计划吧</span><ChevronRight /></button>}</section></section>;
}

function MineCollectionPage({ state, tab, collections, onBack, onPublish, onActivity }: { state: PrototypeState; tab: MineTab; collections: Record<MineTab, Activity[]>; onBack: () => void; onPublish: () => void; onActivity: (activity: Activity) => void }) {
  const activities = getMineSectionActivities(state, collections, tab);
  const title = mineSectionLabel(tab);
  return <section className="page scroll-page"><TopBar title={title} onBack={onBack} /><div className="content-pad list-intro"><span className="eyebrow">个人中心</span><h1>{title}</h1><p>共 {activities.length} 个计划</p></div><div className="card-list content-pad">{activities.map((activity) => <ActivityCard state={state} key={activity.id} activity={activity} onClick={() => onActivity(activity)} />)}{activities.length === 0 && <EmptyState title={`还没有${title}`} text={tab === "published" ? "从一个想去的地方开始吧。" : "相关计划会在状态变化后自动出现在这里。"}>{tab === "published" && <Button onClick={onPublish}>发布计划</Button>}</EmptyState>}</div></section>;
}

function getMineSectionActivities(state: PrototypeState, collections: Record<MineTab, Activity[]>, tab: MineTab) {
  const source = tab === "interested"
    ? [...collections.interested, ...collections.joined].filter((activity) => ["recruiting", "full"].includes(effectiveActivityStatus(state, activity)))
    : tab === "pendingConfirm" ? [...collections.pendingConfirm, ...collections.upcoming] : collections[tab];
  return [...new Map(source.map((activity) => [activity.id, activity])).values()];
}

function availabilityLabel(preference?: UserPreference) {
  const times = preference?.availableTimes ?? [];
  if (times.includes("周末") || (times.includes("周六") && times.includes("周日"))) return "周末比较有空";
  if (times.includes("工作日晚上")) return "工作日晚上有空";
  if (times.includes("节假日")) return "节假日比较有空";
  return times[0] ? `${times[0]}有空` : "还未设置常用时间";
}

function mineSectionLabel(tab: MineTab) { return { published: "我的计划", interested: "待成团", joined: "已加入", pendingConfirm: "待出行", upcoming: "待出行", favorites: "我的收藏", history: "已出行" }[tab]; }

function EmptyState({ title, text, children }: { title: string; text: string; children?: React.ReactNode }) { return <div className="empty-card"><Compass /><h2>{title}</h2><p>{text}</p>{children}</div>; }

function DebugPanel({ state, activity, onRole, onStatus, onParticipant, onAddApplication, onClearBehaviors, onRegenerate, onClose, onReset }: { state: PrototypeState; activity: Activity; onRole: (role: "participant" | "organizer") => void; onStatus: (status: ActivityStatus) => void; onParticipant: (status: ParticipantStatus | "none") => void; onAddApplication: () => void; onClearBehaviors: () => void; onRegenerate: () => void; onClose: () => void; onReset: () => void }) {
  const participant = getUserParticipant(state, activity.id);
  return <aside className="debug-panel"><div className="debug-title"><span><Bug size={16} />Prototype Debug</span><button onClick={onClose}><X size={16} /></button></div><label>用户角色<select value={state.debugRole} onChange={(event) => onRole(event.target.value as "participant" | "organizer")}><option value="participant">参与者</option><option value="organizer">发起人</option></select></label><label>活动状态<select value={activity.status} onChange={(event) => onStatus(event.target.value as ActivityStatus)}><option value="recruiting">招募中</option><option value="full">满员</option><option value="preparing">准备出发</option><option value="ongoing">进行中</option><option value="completed">已结束</option><option value="cancelled">已取消</option></select></label><label>用户状态<select value={participant?.status ?? "none"} onChange={(event) => onParticipant(event.target.value as ParticipantStatus | "none")}><option value="none">未加入</option><option value="joined">已加入</option><option value="confirmed">已确认出发</option><option value="withdrawn">已退出</option><option value="completed">已完成</option></select></label><div className="debug-actions"><button onClick={() => onStatus("preparing")}>模拟出发前 2 天</button><button onClick={() => onStatus("completed")}>模拟活动结束</button><button onClick={() => onParticipant("withdrawn")}>模拟成员退出</button><button onClick={onAddApplication}>模拟新增申请</button><button onClick={onClearBehaviors}>清空行为数据</button><button onClick={onRegenerate}>重新生成推荐</button></div><button className="reset-button" onClick={onReset}><RotateCcw size={15} />重置 V2 Mock</button></aside>;
}

function getPrimaryAction(status: ActivityStatus, applicationStatus?: string, participantStatus?: ParticipantStatus) {
  if (status === "cancelled") return { label: "活动已取消", enabled: false, target: "none" };
  if (status === "completed") return { label: "活动已结束", enabled: false, target: "none" };
  if (participantStatus === "joined") return { label: "进入出发准备", enabled: true, target: "preparation" };
  if (participantStatus === "confirmed") return { label: "查看出发准备", enabled: true, target: "preparation" };
  if (participantStatus === "withdrawn") return { label: "已退出", enabled: false, target: "none" };
  if (applicationStatus === "pending") return { label: "等待确认", enabled: false, target: "none" };
  if (applicationStatus === "rejected") return { label: "暂未通过", enabled: false, target: "none" };
  if (status === "full") return { label: "人数已满", enabled: false, target: "none" };
  if (["preparing", "ongoing"].includes(status)) return { label: "已停止招募", enabled: false, target: "none" };
  return { label: "我感兴趣", enabled: true, target: "apply" };
}

function participantStatusLabel(status: ParticipantStatus) { return { joined: "等待确认", confirmed: "已确认", withdrawn: "已退出", completed: "已完成" }[status]; }
