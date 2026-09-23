"use client";

import { useEffect, useMemo, useReducer, useState } from "react";
import { AlertCircle, ArrowLeft, Bookmark, Bug, CalendarDays, Check, ChevronDown, ChevronRight, CircleUserRound, Compass, Footprints, MapPin, MessageCircle, Plus, RotateCcw, Search, Send, ShieldCheck, Sparkles, Users, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { createInitialState, locations as initialLocations } from "@/lib/zhaodazi/mock-data";
import { getRecommendations, type Recommendation } from "@/lib/zhaodazi/recommendation";
import { prototypeReducer } from "@/lib/zhaodazi/reducer";
import { effectiveActivityStatus, eventStatusLabel, getActivityParticipants, getConfirmedCount, getLocationPlanCount, getMineActivities, getParticipantCount, getUserApplication, getUserParticipant, isFavorite } from "@/lib/zhaodazi/selectors";
import { clearPrototypeState, loadPrototypeState, savePrototypeState } from "@/lib/zhaodazi/storage";
import type { Activity, ActivityCategory, ActivityStatus, AvailableTime, DistancePreference, Intensity, MineTab, Page, ParticipantStatus, PhotoStyle, PrototypeState, PublishForm, SocialStyle, SpendingStyle, User, UserPreference } from "@/lib/zhaodazi/types";

const quickMessages = ["时间刚好合适", "我也很想去", "之前参加过类似活动"];
const categories: ActivityCategory[] = ["徒步", "海边", "露营", "Citywalk", "骑行", "自驾", "看展", "滑雪", "短途旅行"];
const availableTimes: AvailableTime[] = ["工作日晚上", "周六", "周日", "周末", "节假日"];
const mineTabs: MineTab[] = ["published", "interested", "joined", "pendingConfirm", "upcoming", "favorites", "history"];
const standardMineTabs: MineTab[] = ["published", "interested", "joined", "favorites", "history"];
const defaultForm: PublishForm = { locationId: "wutong", when: "本周末", customDate: "", category: "徒步", people: "2", intensity: "正常", socialStyle: "", photoStyle: "", spendingStyle: "", description: "想拍照看日落，不赶时间。", title: "周六一起去梧桐山徒步" };

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
  return <button className="activity-card" onClick={onClick} aria-label={`查看${activity.title}`}><div className="card-topline"><span className="eyebrow">{activity.category} · {activity.intensity}节奏</span><div className="card-status-line">{isFavorite(state, activity.id) && <Bookmark size={15} fill="currentColor" />}<ChevronRight size={18} /></div></div><h3>{activity.title}</h3><div className="meta-row"><CalendarDays size={15} /> {activity.dateLabel} · {activity.startTime}–{activity.endTime}</div><div className="meta-row"><Users size={15} /> {getParticipantCount(state, activity.id)} / {activity.capacity} 人 · {eventStatusLabel(status)}</div>{[activity.socialStyle, activity.photoStyle, activity.spendingStyle].some(Boolean) && <div className="tag-row">{activity.socialStyle && <Tag>{activity.socialStyle}</Tag>}{activity.photoStyle && <Tag>{activity.photoStyle}</Tag>}{activity.spendingStyle && <Tag>{activity.spendingStyle}</Tag>}</div>}{recommendation && recommendation.reasons.length > 0 && <div className="recommendation-line"><Sparkles size={14} /><span>{recommendation.reasons.join(" · ")}</span></div>}<p>{activity.description}</p><div className="organizer-mini"><Avatar user={organizer} /><span>{organizer?.name ?? "搭子"}发起</span></div></button>;
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
  const [filter, setFilter] = useState("全部");
  const [mineTab, setMineTab] = useState<MineTab>("pendingConfirm");
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

  useEffect(() => { dispatch({ type: "HYDRATE", state: loadPrototypeState() }); setHydrated(true); }, []);
  useEffect(() => { if (hydrated) savePrototypeState(state); }, [state, hydrated]);

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
      if (["locationId", "when", "category"].includes(key)) { const location = state.locations.find((item) => item.id === next.locationId)?.name ?? "目的地"; const day = next.when === "本周末" ? "周六" : next.when; next.title = `${day}一起去${location}${next.category}`; }
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
    if (Object.keys(errors).length) { toast.error("请先完成必填信息"); return; }
    setPublishing(true);
    window.setTimeout(() => { dispatch({ type: "PUBLISH_ACTIVITY", form }); setPublishing(false); setMineTab("published"); setPage("mine"); toast.success("计划发布成功"); }, 450);
  };
  const reset = () => { clearPrototypeState(); dispatch({ type: "RESET", state: createInitialState() }); setSelectedActivityId("wutong-sunset"); setPage("discover"); toast.success("V2 Mock 数据已重置"); };

  const activeApplicant = state.applications.find((item) => item.id === activeApplicantId);
  const activeApplicantUser = state.users.find((user) => user.id === activeApplicant?.userId);
  const currentRecommendation = recommendationById.get(selectedActivity.id);
  const primaryAction = getPrimaryAction(selectedStatus, application?.status, participant?.status);

  return <main className="prototype-stage"><div className="phone-shell"><div className="phone-status"><span>9:41</span><span>● ︵ ▰</span></div><div className="screen">
    {page === "discover" && <DiscoverPage state={state} recommendations={recommendations} selectedMarker={selectedMapLocationId} onSelectMarker={setSelectedMapLocationId} onSearch={() => setSearchOpen(true)} onLocation={openLocation} onPreference={() => setPage("preference")} onDetail={(activity) => goDetail(activity, "discover")} />}
    {page === "list" && <section className="page scroll-page"><TopBar title={selectedLocation.name} onBack={() => setPage("discover")} /><div className="content-pad list-intro"><span className="eyebrow">{selectedLocation.district}</span><h1>{selectedLocation.name}</h1><p>{getLocationPlanCount(state, selectedLocation.id)} 个可查看计划 · 当前展示 {listActivities.length} 个</p></div><div className="chip-scroll sticky-chips">{["全部", "今天", "本周末", "轻松", "仅看有空位"].map((item) => <button className={`chip ${filter === item ? "active" : ""}`} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><div className="card-list content-pad">{listActivities.map((activity) => <ActivityCard state={state} key={activity.id} activity={activity} recommendation={recommendationById.get(activity.id)} onClick={() => goDetail(activity, "list")} />)}{listActivities.length === 0 && <EmptyState title="没有符合条件的计划" text="换一个筛选条件再看看。"><Button variant="outline" onClick={() => setFilter("全部")}>清除筛选</Button></EmptyState>}</div></section>}
    {page === "detail" && <DetailPage state={state} activity={selectedActivity} status={selectedStatus} organizer={organizer} participant={participant} participants={participants} isOrganizer={isOrganizer} recommendation={currentRecommendation} pendingCount={pendingApplications.length} primaryAction={primaryAction} onBack={() => setPage(returnPage)} onFavorite={toggleFavorite} onProfile={(id) => openProfile(id, "detail")} onApplications={() => setPage("applications")} onPreparation={() => setPage("preparation")} onApply={() => setInterestOpen(true)} onCancel={() => setConfirmAction("cancel")} onWithdraw={() => setConfirmAction("withdraw")} />}
    {page === "publish" && <PublishPage state={state} form={form} errors={formErrors} styleOpen={styleOpen} publishing={publishing} onBack={() => setPage("discover")} onStyle={() => setStyleOpen(!styleOpen)} onChange={updateFormChoice} onPublish={publish} />}
    {page === "applications" && <ApplicationsPage state={state} activity={selectedActivity} applications={currentApplications} pendingCount={pendingApplications.length} status={selectedStatus} onBack={() => setPage("detail")} onProfile={(id) => openProfile(id, "applications")} onAccept={acceptApplication} onReject={(id) => dispatch({ type: "REJECT_APPLICATION", applicationId: id })} />}
    {page === "success" && <SuccessPage state={state} activity={selectedActivity} user={activeApplicantUser} onClose={() => setPage("detail")} onPreparation={() => setPage("preparation")} />}
    {page === "preparation" && <PreparationPage state={state} activity={selectedActivity} participant={participant} participants={participants} isOrganizer={isOrganizer} onBack={() => setPage("detail")} onProfile={(id) => openProfile(id, "preparation")} onConfirm={() => { dispatch({ type: "CONFIRM_PARTICIPATION", activityId: selectedActivity.id }); toast.success("已确认参加"); }} onChat={() => setMockDialog("chat")} onWithdraw={() => setConfirmAction("withdraw")} />}
    {page === "profile" && selectedUser && <ProfilePage user={selectedUser} onBack={() => setPage(returnPage)} />}
    {page === "preference" && preferenceDraft && <PreferencePage draft={preferenceDraft} onBack={() => setPage("mine")} onChange={setPreferenceDraft} onSave={() => { if (!preferenceDraft.categories.length || !preferenceDraft.availableTimes.length) { toast.error("请至少选择 1 个活动和 1 个常见时间"); return; } dispatch({ type: "SAVE_PREFERENCE", preference: { ...preferenceDraft, updatedAt: new Date().toISOString() } }); toast.success("偏好已保存，推荐已更新"); setPage("discover"); }} />}
    {page === "mine" && <MinePage state={state} currentUser={currentUser} preference={preference} tab={mineTab} collections={mineCollections} onTab={setMineTab} onProfile={() => openProfile(state.currentUserId, "mine")} onPreference={() => setPage("preference")} onPublish={() => setPage("publish")} onActivity={(activity) => { if (["pendingConfirm", "upcoming"].includes(mineTab)) { setSelectedActivityId(activity.id); setPage("preparation"); } else goDetail(activity, "mine"); }} />}
  </div>
  {page !== "success" && <BottomTabs page={page} onChange={setPage} />}
  <button className="debug-fab" aria-label="打开原型测试面板" onClick={() => setDebugOpen(!debugOpen)}><Bug size={18} /></button>
  {debugOpen && <DebugPanel state={state} activity={selectedActivity} onClose={() => setDebugOpen(false)} onReset={reset} onStatus={(status) => dispatch({ type: "SET_ACTIVITY_STATUS", activityId: selectedActivity.id, status })} onParticipant={(status) => dispatch({ type: "SET_PARTICIPANT_STATUS", activityId: selectedActivity.id, status })} onRole={(role) => dispatch({ type: "SET_ROLE", role })} onAddApplication={() => { dispatch({ type: "ADD_DEBUG_APPLICATION", activityId: selectedActivity.id }); toast.success("已生成一条待处理申请"); }} onClearBehaviors={() => { dispatch({ type: "CLEAR_BEHAVIORS" }); toast.success("当前用户行为数据已清空"); }} onRegenerate={() => toast.success("推荐已根据当前偏好重新计算")} />}
  </div>

  <Sheet open={interestOpen} onOpenChange={setInterestOpen}><SheetContent side="bottom" className="interest-sheet"><SheetHeader><SheetTitle>和发起人打个招呼</SheetTitle><SheetDescription>快捷表达和补充文字会一起发送给发起人。</SheetDescription></SheetHeader><div className="sheet-body"><div className="quick-grid">{quickMessages.map((item) => <button key={item} className={selectedQuick.includes(item) ? "selected" : ""} onClick={() => setSelectedQuick((current) => current.includes(item) ? current.filter((value) => value !== item) : [...current, item])}>{selectedQuick.includes(item) && <Check size={15} />}{item}</button>)}</div><label className="field"><span>补充一句</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} /></label></div><SheetFooter><Button size="lg" onClick={sendApplication} disabled={submittingInterest}><Send />{submittingInterest ? "发送中…" : "发送申请"}</Button></SheetFooter></SheetContent></Sheet>
  <Sheet open={searchOpen} onOpenChange={setSearchOpen}><SheetContent side="bottom" className="interest-sheet search-sheet"><SheetHeader><SheetTitle>搜索地点或活动</SheetTitle><SheetDescription>输入地点、活动类型或标签。</SheetDescription></SheetHeader><div className="sheet-body"><label className="search-input"><Search size={18} /><input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="例如：大鹏、露营、日落" /></label><div className="search-results">{searchResults.map((activity) => <button key={activity.id} onClick={() => { setSearchOpen(false); goDetail(activity, "discover"); }}><span><b>{activity.title}</b><small>{state.locations.find((item) => item.id === activity.locationId)?.name} · {activity.dateLabel}</small></span><ChevronRight size={18} /></button>)}{searchResults.length === 0 && <p>没有找到相关计划，换个地点或关键词试试。</p>}</div></div></SheetContent></Sheet>
  <AlertDialog open={confirmAction !== null} onOpenChange={(open) => !open && setConfirmAction(null)}><AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>{confirmAction === "cancel" ? "确认取消这次活动吗？" : "确认退出这次活动吗？"}</AlertDialogTitle><AlertDialogDescription>{confirmAction === "cancel" ? "取消后所有成员会看到活动已取消，申请入口也会关闭。" : "退出后将释放一个名额，并记录一次临时退出。"}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>再想想</AlertDialogCancel><AlertDialogAction variant="destructive" onClick={() => { if (confirmAction === "cancel") dispatch({ type: "CANCEL_ACTIVITY", activityId: selectedActivity.id }); if (confirmAction === "withdraw") dispatch({ type: "WITHDRAW", activityId: selectedActivity.id }); setConfirmAction(null); toast.success(confirmAction === "cancel" ? "活动已取消" : "已退出活动"); }}>{confirmAction === "cancel" ? "确认取消" : "确认退出"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  <AlertDialog open={mockDialog !== null} onOpenChange={(open) => !open && setMockDialog(null)}><AlertDialogContent size="sm"><AlertDialogHeader><AlertDialogTitle>{mockDialog === "chat" ? "临时群聊（Mock）" : "申请已发送"}</AlertDialogTitle><AlertDialogDescription>{mockDialog === "chat" ? "V2 原型仍不接入真实聊天，这里只模拟进入临时群聊。" : "发起人接受后，你会成为活动成员，并进入出发准备。"}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={() => setMockDialog(null)}>知道了</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog><Toaster position="top-center" /></main>;
}

function DiscoverPage({ state, recommendations, selectedMarker, onSelectMarker, onSearch, onLocation, onPreference, onDetail }: { state: PrototypeState; recommendations: Recommendation[]; selectedMarker: PrototypeState["locations"][number]["id"]; onSelectMarker: (id: PrototypeState["locations"][number]["id"]) => void; onSearch: () => void; onLocation: (id: PrototypeState["locations"][number]["id"], filter?: string) => void; onPreference: () => void; onDetail: (activity: Activity) => void }) {
  return <section className="page map-page"><header className="map-header"><div><span className="eyebrow">当前城市</span><strong>深圳 <span aria-hidden>⌄</span></strong></div><button className="search-pill" onClick={onSearch}><Search size={18} /><span>搜索地点或活动</span></button></header><div className="chip-scroll"><button className="chip" onClick={() => onLocation("wutong", "本周末")}>本周末</button><button className="chip" onClick={() => onLocation("shenzhen-bay", "仅看有空位")}>附近</button><button className="chip" onClick={() => onLocation("wutong", "轻松")}>轻松活动</button><button className="chip" onClick={onSearch}>更多筛选</button></div><div className="mock-map" aria-label="活动地点地图"><span className="road road-one" /><span className="road road-two" /><span className="water" />{state.locations.filter((location) => location.id !== "futian").map((location) => <button className={`map-marker ${location.markerClass} ${selectedMarker === location.id ? "selected" : ""}`} key={location.id} onClick={() => selectedMarker === location.id ? onLocation(location.id) : onSelectMarker(location.id)}><span><MapPin size={14} />{location.name}</span><b>{getLocationPlanCount(state, location.id)}</b><small>{location.categoryHint} · 再点一次查看计划</small></button>)}<div className="map-label label-city">深圳市</div><div className="map-label label-sea">大鹏湾</div></div><div className="map-bottom v2-recommendations"><div className="section-heading"><div><span className="eyebrow">根据你的偏好</span><h2>适合你的计划</h2></div><button onClick={onPreference}><Sparkles size={16} />调整偏好</button></div>{recommendations.length > 0 ? <div className="recommendation-scroll">{recommendations.slice(0, 3).map((item) => <button className="featured-card recommendation-card" key={item.activity.id} onClick={() => onDetail(item.activity)}><div className="featured-icon"><Footprints size={25} /></div><div><h3>{item.activity.title}</h3><p>{item.activity.dateLabel} {item.activity.startTime} · {getParticipantCount(state, item.activity.id)}/{item.activity.capacity}人</p><div className="reason-copy"><Sparkles size={12} />{item.reasons[0] ?? "正在招募"}</div></div><ChevronRight size={20} /></button>)}</div> : <div className="recommendation-empty"><span>暂时没有匹配的可报名计划</span><button onClick={onPreference}>调整偏好</button><button onClick={() => onLocation("wutong")}>查看全部</button></div>}</div></section>;
}

function DetailPage({ state, activity, status, organizer, participant, participants, isOrganizer, recommendation, pendingCount, primaryAction, onBack, onFavorite, onProfile, onApplications, onPreparation, onApply, onCancel, onWithdraw }: { state: PrototypeState; activity: Activity; status: ActivityStatus; organizer?: User; participant?: PrototypeState["participants"][number]; participants: PrototypeState["participants"]; isOrganizer: boolean; recommendation?: Recommendation; pendingCount: number; primaryAction: { label: string; enabled: boolean; target: string }; onBack: () => void; onFavorite: () => void; onProfile: (id: string) => void; onApplications: () => void; onPreparation: () => void; onApply: () => void; onCancel: () => void; onWithdraw: () => void }) {
  return <section className="page scroll-page detail-page"><TopBar title="活动详情" onBack={onBack} right={<button className={`icon-button ${isFavorite(state, activity.id) ? "favorite-active" : ""}`} onClick={onFavorite} aria-label="收藏"><Bookmark size={20} fill={isFavorite(state, activity.id) ? "currentColor" : "none"} /></button>} />{status === "cancelled" && <div className="status-banner danger"><AlertCircle size={18} />活动已取消</div>}{status === "completed" && <div className="status-banner">活动已结束</div>}{status === "preparing" && <button className="status-banner preparing-banner" onClick={onPreparation}><CalendarDays size={18} />已进入出发准备，查看成员确认情况<ChevronRight size={17} /></button>}<div className="content-pad detail-hero"><span className="eyebrow">{activity.category} · {eventStatusLabel(status)}</span><h1>{activity.title}</h1><div className="facts-grid"><div><CalendarDays /><span><small>时间</small>{activity.dateLabel}<br />{activity.startTime}–{activity.endTime}</span></div><div><MapPin /><span><small>地点</small>{state.locations.find((item) => item.id === activity.locationId)?.name}</span></div><div><Users /><span><small>人数</small>{getParticipantCount(state, activity.id)} / {activity.capacity} 人</span></div><div><span className="fact-symbol">¥</span><span><small>预算</small>{activity.budgetMin}–{activity.budgetMax} 元</span></div></div></div><div className="detail-section"><h2>这个局适不适合你</h2><div className="tag-row large"><Tag accent>{activity.intensity}节奏</Tag><Tag>{activity.socialStyle}</Tag><Tag>{activity.photoStyle}</Tag><Tag>{activity.spendingStyle}</Tag></div></div>{recommendation && <div className="detail-section recommendation-box"><h2><Sparkles size={18} />为什么推荐给你</h2>{recommendation.reasons.map((reason) => <p key={reason}><Check size={16} />{reason}</p>)}</div>}<div className="detail-section"><h2>计划说明</h2><p>{activity.description}</p></div><button className="detail-section organizer-profile" onClick={() => onProfile(activity.organizerId)}><Avatar user={organizer} /><span><small>发起人</small><b>{organizer?.name}</b><em><ShieldCheck size={14} />履约率 {organizer?.fulfillmentRate}%</em></span><ChevronRight /></button><div className="detail-section"><div className="section-heading compact"><h2>同行成员</h2><span>{getConfirmedCount(state, activity.id)} 人已确认</span></div><div className="people-row">{participants.map((item) => { const user = state.users.find((candidate) => candidate.id === item.userId); return <button key={item.userId} onClick={() => onProfile(item.userId)}><Avatar user={user} /><b>{user?.name}</b><small>{participantStatusLabel(item.status)}</small></button>; })}</div></div>{isOrganizer && pendingCount > 0 && <button className="application-entry" onClick={onApplications}><span><b>{pendingCount} 人等待你的确认</b><small>查看并处理搭子申请</small></span><ChevronRight /></button>}{(isOrganizer || participant) && <div className="detail-management">{isOrganizer && !["cancelled", "completed"].includes(status) && <button onClick={onCancel}>取消活动</button>}{participant && !isOrganizer && ["joined", "confirmed"].includes(participant.status) && <button onClick={onWithdraw}>退出活动</button>}</div>}<div className="bottom-spacer" /><div className="bottom-action">{isOrganizer ? <><Button variant="outline" size="lg" onClick={onApplications} disabled={["cancelled", "completed"].includes(status)}><Users />查看申请</Button><Button size="lg" onClick={onPreparation}><CalendarDays />出发准备</Button></> : <><Button variant="outline" size="lg" onClick={onFavorite}><Bookmark fill={isFavorite(state, activity.id) ? "currentColor" : "none"} />{isFavorite(state, activity.id) ? "已收藏" : "收藏"}</Button><Button size="lg" disabled={!primaryAction.enabled} onClick={() => primaryAction.target === "apply" ? onApply() : primaryAction.target === "preparation" && onPreparation()}>{primaryAction.label}</Button></>}</div></section>;
}

function PublishPage({ state, form, errors, styleOpen, publishing, onBack, onStyle, onChange, onPublish }: { state: PrototypeState; form: PublishForm; errors: Record<string, string>; styleOpen: boolean; publishing: boolean; onBack: () => void; onStyle: () => void; onChange: <K extends keyof PublishForm>(key: K, value: PublishForm[K]) => void; onPublish: () => void }) {
  return <section className="page scroll-page"><TopBar title="发布计划" onBack={onBack} /><div className="content-pad publish-intro"><span className="eyebrow">轻量发起</span><h1>这次想去哪？</h1><p>先把计划说清楚，再找合适的搭子。</p></div><div className="form-stack content-pad"><fieldset className="choice-field"><legend>去哪</legend><div>{state.locations.slice(0, 4).map((location) => <button type="button" key={location.id} className={form.locationId === location.id ? "selected" : ""} onClick={() => onChange("locationId", location.id)}>{form.locationId === location.id && <Check size={14} />}{location.name}</button>)}</div></fieldset><ChoiceField label="什么时候" options={["今天", "明天", "本周末", "自定义"]} value={form.when} onChange={(value) => onChange("when", value)} />{form.when === "自定义" && <label className={`field ${errors.customDate ? "field-error" : ""}`}><span>具体日期</span><input type="date" value={form.customDate} onChange={(event) => onChange("customDate", event.target.value)} />{errors.customDate && <small className="error-text">{errors.customDate}</small>}</label>}<ChoiceField label="想做什么" options={categories.slice(0, 6)} value={form.category} onChange={(value) => onChange("category", value)} /><ChoiceField label="再找几个人" options={["1", "2", "3", "4+"]} value={form.people} onChange={(value) => onChange("people", value)} /><ChoiceField label="什么节奏" options={["轻松", "正常", "特种兵"] as Intensity[]} value={form.intensity} onChange={(value) => onChange("intensity", value)} /><section className="style-section"><button className="style-toggle" onClick={onStyle}><span><b>这个局是什么感觉</b><small>选填，可以跳过</small></span><ChevronDown className={styleOpen ? "rotated" : ""} /></button>{styleOpen && <div className="style-fields"><ChoiceField label="社交程度" options={["各玩各的", "随缘聊天", "热闹一点"] as SocialStyle[]} value={form.socialStyle} onChange={(value) => onChange("socialStyle", value)} /><ChoiceField label="拍照需求" options={["不太拍", "随手拍", "喜欢拍照"] as PhotoStyle[]} value={form.photoStyle} onChange={(value) => onChange("photoStyle", value)} /><ChoiceField label="消费习惯" options={["省钱优先", "正常消费", "体验优先"] as SpendingStyle[]} value={form.spendingStyle} onChange={(value) => onChange("spendingStyle", value)} /></div>}</section><label className={`field ${errors.description ? "field-error" : ""}`}><span>一句话说明</span><textarea value={form.description} onChange={(event) => onChange("description", event.target.value)} maxLength={80} /><small className={errors.description ? "error-text" : ""}>{errors.description || `${form.description.length}/80`}</small></label><label className={`field generated ${errors.title ? "field-error" : ""}`}><span>自动生成标题 <em>可编辑</em></span><input value={form.title} onChange={(event) => onChange("title", event.target.value)} /><Sparkles size={18} />{errors.title && <small className="error-text">{errors.title}</small>}</label><Button size="lg" className="wide-button" onClick={onPublish} disabled={publishing}>{publishing ? "发布中…" : "发布计划"}</Button></div></section>;
}

function ApplicationsPage({ state, activity, applications, pendingCount, status, onBack, onProfile, onAccept, onReject }: { state: PrototypeState; activity: Activity; applications: PrototypeState["applications"]; pendingCount: number; status: ActivityStatus; onBack: () => void; onProfile: (id: string) => void; onAccept: (id: string) => void; onReject: (id: string) => void }) {
  return <section className="page scroll-page"><TopBar title="搭子申请" onBack={onBack} /><div className="content-pad applications-intro"><span className="eyebrow">{activity.title}</span><h1>{pendingCount} 人等待确认</h1><p>接受后会创建独立成员记录，进入出发准备。</p></div><div className="card-list content-pad">{applications.map((item) => { const user = state.users.find((candidate) => candidate.id === item.userId); return <article className="application-card" key={item.id}><button className="applicant-head" onClick={() => onProfile(item.userId)}><Avatar user={user} /><div><h2>{user?.name} <small>{user?.age} 岁</small></h2><p>参加 {user?.joinedCount} 次 · 履约率 {user?.fulfillmentRate}%</p></div><ChevronRight /></button>{item.quickMessages.length > 0 && <div className="tag-row application-tags">{item.quickMessages.map((text) => <Tag key={text}>{text}</Tag>)}</div>}<blockquote>“{item.message || "没有补充文字"}”</blockquote><div className="application-actions"><Button variant="outline" disabled={item.status !== "pending" || !["recruiting", "full"].includes(status)} onClick={() => onReject(item.id)}>{item.status === "rejected" ? "已婉拒" : "暂不合适"}</Button><Button disabled={item.status !== "pending" || !["recruiting", "full"].includes(status)} onClick={() => onAccept(item.id)}>{item.status === "accepted" ? <><Check />已加入</> : item.status === "pending" ? "一起去" : "已处理"}</Button></div></article>; })}{applications.length === 0 && <EmptyState title="暂时还没有申请" text="有人表达兴趣后会出现在这里。" />}</div></section>;
}

function SuccessPage({ state, activity, user, onClose, onPreparation }: { state: PrototypeState; activity: Activity; user?: User; onClose: () => void; onPreparation: () => void }) {
  return <section className="page success-page"><button className="success-close" onClick={onClose} aria-label="关闭"><X /></button><div className="success-mark"><Check size={38} /></div><span className="eyebrow">双向确认完成</span><h1>已加入计划</h1><p>{user ? `${user.name} 已经成为同行成员。` : "你已经成为这次出行的成员。"}</p><div className="success-card"><div className="success-route"><span>{activity.dateLabel}</span><div /><span>{state.locations.find((item) => item.id === activity.locationId)?.name}</span></div><h2>{activity.title}</h2><p>{activity.startTime}–{activity.endTime} · 当前 {getParticipantCount(state, activity.id)}/{activity.capacity} 人</p><div className="next-step"><CalendarDays /><span><b>下一步：出发准备</b><small>成员需要在出发前确认参加</small></span></div></div><div className="success-actions"><Button size="lg" onClick={onPreparation}><CalendarDays />进入出发准备</Button><Button variant="outline" size="lg" onClick={onClose}>查看计划</Button></div></section>;
}

function PreparationPage({ state, activity, participant, participants, isOrganizer, onBack, onProfile, onConfirm, onChat, onWithdraw }: { state: PrototypeState; activity: Activity; participant?: PrototypeState["participants"][number]; participants: PrototypeState["participants"]; isOrganizer: boolean; onBack: () => void; onProfile: (id: string) => void; onConfirm: () => void; onChat: () => void; onWithdraw: () => void }) {
  return <section className="page scroll-page preparation-page"><TopBar title="出发准备" onBack={onBack} /><div className="preparation-hero content-pad"><span className="eyebrow">距离出发还有 2 天</span><h1>{activity.title}</h1><div className="preparation-facts"><span><CalendarDays />{activity.dateLabel} {activity.startTime}–{activity.endTime}</span><span><MapPin />{state.locations.find((item) => item.id === activity.locationId)?.name}</span></div></div><div className="detail-section"><div className="section-heading compact"><h2>当前成员</h2><span>{getConfirmedCount(state, activity.id)} / {getParticipantCount(state, activity.id)} 人已确认</span></div><div className="member-list">{participants.map((item) => { const user = state.users.find((candidate) => candidate.id === item.userId); return <button key={item.userId} onClick={() => onProfile(item.userId)}><Avatar user={user} /><span><b>{user?.name}{item.userId === activity.organizerId && <small> 发起人</small>}</b><em className={`member-status status-${item.status}`}>{participantStatusLabel(item.status)}</em></span><ChevronRight /></button>; })}</div></div><div className="preparation-note"><ShieldCheck /><span><b>确认参加不是报名成功</b><small>请在确定能够到场后再确认，临时有事也可以退出。</small></span></div><div className="preparation-actions">{participant?.status === "joined" && <Button size="lg" onClick={onConfirm}><Check />确认参加</Button>}{participant?.status === "confirmed" && <Button size="lg" disabled><Check />已确认参加</Button>}<Button variant="outline" onClick={onChat}><MessageCircle />联系大家</Button>{participant && !isOrganizer && ["joined", "confirmed"].includes(participant.status) && <button className="text-danger" onClick={onWithdraw}>临时有事，退出活动</button>}</div></section>;
}

function ProfilePage({ user, onBack }: { user: User; onBack: () => void }) {
  return <section className="page scroll-page"><TopBar title="出游资料" onBack={onBack} /><div className="profile-hero content-pad"><Avatar user={user} /><div><h1>{user.name} <small>{user.age} 岁</small></h1><p>{user.city} · 轻量出游资料</p></div></div><div className="trust-strip content-pad">{user.verifiedWechat && <span><Check />微信已验证</span>}{user.verifiedPhone && <span><Check />手机号已验证</span>}{user.verifiedIdentity && <span><ShieldCheck />实名认证</span>}</div><div className="detail-section"><h2>出游记录</h2><div className="record-grid"><div><b>{user.joinedCount}</b><span>参加活动</span></div><div><b>{user.organizedCount}</b><span>发起活动</span></div><div><b>{user.completedCount}</b><span>完成出行</span></div></div></div><div className="detail-section"><h2>履约信息</h2><div className="fulfillment-row"><b>{user.fulfillmentRate}%</b><span>履约率<small>近 3 个月临时取消 {user.recentCancellationCount} 次</small></span></div></div><div className="detail-section"><h2>这个人怎么玩</h2><p><b>常去：</b>{user.commonCategories.join(" / ")}</p><p><b>节奏：</b>{user.preferredIntensity}</p><p><b>社交：</b>{user.preferredSocialStyle}</p></div><div className="detail-section"><h2>同行印象</h2><div className="tag-row large">{user.impressionTags.map((tag) => <Tag key={tag}>{tag}</Tag>)}</div><small className="privacy-note">来自已完成活动的同行反馈；问题反馈不会公开展示。</small></div></section>;
}

function PreferencePage({ draft, onBack, onChange, onSave }: { draft: UserPreference; onBack: () => void; onChange: (value: UserPreference) => void; onSave: () => void }) {
  return <section className="page scroll-page"><TopBar title="出游偏好" onBack={onBack} /><div className="content-pad publish-intro"><span className="eyebrow">轻量推荐依据</span><h1>你通常喜欢怎么玩？</h1><p>随时可以修改，只用于计划排序和推荐理由。</p></div><div className="form-stack content-pad"><MultiChoice label="喜欢的活动" options={categories} value={draft.categories} max={5} onChange={(value) => onChange({ ...draft, categories: value })} /><MultiChoice label="常见出游时间" options={availableTimes} value={draft.availableTimes} onChange={(value) => onChange({ ...draft, availableTimes: value })} /><ChoiceField label="常见出游距离" options={["附近", "50km 内", "100km 内", "周边城市", "都可以"] as DistancePreference[]} value={draft.distancePreference} onChange={(value) => onChange({ ...draft, distancePreference: value })} /><ChoiceField label="喜欢的节奏" options={["轻松", "正常", "特种兵"] as Intensity[]} value={draft.intensityPreference} onChange={(value) => onChange({ ...draft, intensityPreference: value })} /><ChoiceField label="喜欢的社交程度" options={["各玩各的", "随缘聊天", "热闹一点"] as SocialStyle[]} value={draft.socialPreference} onChange={(value) => onChange({ ...draft, socialPreference: value })} /><Button size="lg" className="wide-button" onClick={onSave}>保存并查看推荐</Button></div></section>;
}

function MinePage({ state, currentUser, preference, tab, collections, onTab, onProfile, onPreference, onPublish, onActivity }: { state: PrototypeState; currentUser?: User; preference?: UserPreference; tab: MineTab; collections: Record<MineTab, Activity[]>; onTab: (tab: MineTab) => void; onProfile: () => void; onPreference: () => void; onPublish: () => void; onActivity: (activity: Activity) => void }) {
  const pendingTasks = collections.pendingConfirm.length;
  const upcomingTasks = collections.upcoming.length;
  return <section className="page scroll-page"><div className="content-pad mine-head"><span className="eyebrow">个人中心 · {state.debugRole === "participant" ? "参与者" : "发起人"}视角</span><h1>我的计划</h1><button className="profile-row" onClick={onProfile}><Avatar user={currentUser} /><div><b>{currentUser?.name}</b><p>参加 {currentUser?.joinedCount} 次 · 履约率 {currentUser?.fulfillmentRate}%</p></div><ChevronRight /></button><button className="preference-entry" onClick={onPreference}><Sparkles /><span><b>出游偏好</b><small>{preference?.categories.join(" · ") || "设置后获得更合适的推荐"}</small></span><ChevronRight /></button></div>{(pendingTasks > 0 || upcomingTasks > 0) && <div className="mine-tasks content-pad"><span className="eyebrow">待办事项</span>{pendingTasks > 0 && <button onClick={() => onTab("pendingConfirm")}><CalendarDays /><span><b>{pendingTasks} 个计划待确认参加</b><small>确认后会进入即将出发</small></span><ChevronRight /></button>}{upcomingTasks > 0 && <button onClick={() => onTab("upcoming")}><Check /><span><b>{upcomingTasks} 个计划即将出发</b><small>查看时间、地点和同行成员</small></span><ChevronRight /></button>}</div>}<div className="summary-grid content-pad">{standardMineTabs.map((item) => <button className={tab === item ? "active" : ""} key={item} onClick={() => onTab(item)}><b>{collections[item].length}</b><span>{mineTabLabel(item)}</span></button>)}</div><div className="card-list content-pad">{collections[tab].map((activity) => <ActivityCard state={state} key={activity.id} activity={activity} onClick={() => onActivity(activity)} />)}{collections[tab].length === 0 && <EmptyState title="这里还没有计划" text={tab === "published" ? "从一个想去的地方开始吧。" : "完成对应操作后，计划会出现在这里。"}>{tab === "published" && <Button onClick={onPublish}>发布计划</Button>}</EmptyState>}</div></section>;
}

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
function mineTabLabel(tab: MineTab) { return { published: "我发布的", interested: "感兴趣", joined: "已加入", pendingConfirm: "待确认", upcoming: "即将出发", favorites: "收藏", history: "历史" }[tab]; }
