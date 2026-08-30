"use client";

import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Activity,
  Bike,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleGauge,
  Dumbbell,
  Footprints,
  HeartPulse,
  PersonStanding,
  Plus,
  Scale,
  Sparkles,
  Waves,
  Zap,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ActivityRecord = {
  id: number;
  type: string;
  activityDate: string;
  startTime: string | null;
  status: "scheduled" | "completed" | "cancelled";
  createdAt: string;
};

type WeightRecord = {
  id: number;
  weight: number;
  measuredAt: string;
  createdAt: string;
};

type ActivityTypeDef = {
  id?: number;
  name: string;
  iconKey: string;
  color: string;
  hidden?: number | boolean;
  custom?: boolean;
};

type Period = "all" | "month" | "year";
type View = "today" | "calendar" | "activity" | "weight";
type PendingAction = { kind: "delete" | "cancel" | "reactivate"; activity: ActivityRecord } | null;

const defaultActivityTypes: ActivityTypeDef[] = [
  { name: "Spinning", iconKey: "bike", color: "#17a673" },
  { name: "Barre", iconKey: "balance", color: "#8dbb3d" },
  { name: "Caminar", iconKey: "walk", color: "#e7a72d" },
  { name: "El·líptica", iconKey: "gauge", color: "#309a91" },
  { name: "Cinta de córrer", iconKey: "run", color: "#ef6b55" },
  { name: "Altres", iconKey: "sparkles", color: "#8a72ca" },
];
const iconOptions = ["sparkles", "dumbbell", "heart", "waves", "zap", "walk"] as const;
const colorOptions = ["#17a673", "#8dbb3d", "#e7a72d", "#ef6b55", "#309a91", "#8a72ca"];
const monthNames = [
  "gener", "febrer", "març", "abril", "maig", "juny",
  "juliol", "agost", "setembre", "octubre", "novembre", "desembre",
];
const weekDays = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"];

function localIso(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIso(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("ca-ES", { day: "numeric", month: "short", year: "numeric" })
    .format(parseIso(value))
    .replace(".", "");
}

function longDate(value: string) {
  return new Intl.DateTimeFormat("ca-ES", { weekday: "long", day: "numeric", month: "long" })
    .format(parseIso(value));
}

function formatWeight(value: number) {
  return value.toLocaleString("ca-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

function samePeriod(value: string, period: Period, anchor: Date) {
  if (period === "all") return true;
  const date = parseIso(value);
  if (period === "year") return date.getFullYear() === anchor.getFullYear();
  return date.getFullYear() === anchor.getFullYear() && date.getMonth() === anchor.getMonth();
}

function ActivityGlyph({ type, iconKey }: { type?: string; iconKey?: string }) {
  const key = iconKey ??
    (type === "Caminar" ? "walk" : type === "Cinta de córrer" ? "run" : type === "El·líptica" ? "gauge" : "activity");
  if (key === "bike") return <Bike />;
  if (key === "balance") return <PersonStanding />;
  if (key === "walk" || key === "run") return <Footprints />;
  if (key === "gauge") return <CircleGauge />;
  if (key === "dumbbell") return <Dumbbell />;
  if (key === "heart") return <HeartPulse />;
  if (key === "waves") return <Waves />;
  if (key === "zap") return <Zap />;
  if (key === "sparkles") return <Sparkles />;
  return <Activity />;
}

function definitionFor(type: string, definitions: ActivityTypeDef[]) {
  return definitions.find((item) => item.name === type) ??
    defaultActivityTypes.find((item) => item.name === type) ??
    { name: type, iconKey: "sparkles", color: "#6f9f78" };
}

export function ActivatApp() {
  const today = localIso();
  const [view, setView] = useState<View>("today");
  const [activities, setActivities] = useState<ActivityRecord[]>([]);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [activityTypePrefs, setActivityTypePrefs] = useState<ActivityTypeDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [carouselIndex, setCarouselIndex] = useState(0);

  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(today);
  const [activityOpen, setActivityOpen] = useState(false);
  const [editingScheduleId, setEditingScheduleId] = useState<number | null>(null);
  const [activityType, setActivityType] = useState("Spinning");
  const [activityTime, setActivityTime] = useState("");
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [newActivityOpen, setNewActivityOpen] = useState(false);
  const [newActivityName, setNewActivityName] = useState("");
  const [newActivityIcon, setNewActivityIcon] = useState("sparkles");
  const [newActivityColor, setNewActivityColor] = useState("#17a673");
  const [editingActivityName, setEditingActivityName] = useState<string | null>(null);

  const [activityFilter, setActivityFilter] = useState("Totes");
  const [activityPeriod, setActivityPeriod] = useState<Period>("all");
  const [activityAnchor, setActivityAnchor] = useState(new Date());
  const [weightPeriod, setWeightPeriod] = useState<Period>("all");
  const [weightAnchor, setWeightAnchor] = useState(new Date());

  const [weightOpen, setWeightOpen] = useState(false);
  const [editingWeightId, setEditingWeightId] = useState<number | null>(null);
  const [pendingWeightDelete, setPendingWeightDelete] = useState<WeightRecord | null>(null);
  const [weightValue, setWeightValue] = useState("");
  const [weightDate, setWeightDate] = useState(today);

  async function loadData() {
    try {
      setError("");
      const response = await fetch("/api/data", { cache: "no-store" });
      const data = (await response.json()) as {
        activities?: ActivityRecord[];
        weights?: WeightRecord[];
        activityTypes?: ActivityTypeDef[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "No s’han pogut carregar les dades.");
      setActivities(data.activities ?? []);
      setWeights(data.weights ?? []);
      setActivityTypePrefs(data.activityTypes ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "No s’han pogut carregar les dades.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function postData(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "No s’ha pogut desar.");
      await loadData();
      return true;
    } catch (postError) {
      setError(postError instanceof Error ? postError.message : "No s’ha pogut desar.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const upcomingDayActivities = useMemo(() => {
    const upcoming = [...activities]
      .filter((item) => item.status === "scheduled" && item.activityDate >= today)
      .sort((a, b) =>
        `${a.activityDate} ${a.startTime ?? "23:59"} ${String(a.id).padStart(10, "0")}`.localeCompare(
          `${b.activityDate} ${b.startTime ?? "23:59"} ${String(b.id).padStart(10, "0")}`,
        ),
      );
    const firstDate = upcoming[0]?.activityDate;
    return firstDate ? upcoming.filter((item) => item.activityDate === firstDate) : [];
  }, [activities, today]);

  const upcomingCarouselKey = upcomingDayActivities.map((item) => item.id).join("-");
  useEffect(() => setCarouselIndex(0), [upcomingCarouselKey]);

  const nextActivity = useMemo(
    () => upcomingDayActivities[Math.min(carouselIndex, Math.max(upcomingDayActivities.length - 1, 0))],
    [upcomingDayActivities, carouselIndex],
  );

  const activityTypes = useMemo(() => {
    const preferences = new Map(activityTypePrefs.map((item) => [item.name, item]));
    const defaults = defaultActivityTypes
      .map((item) => ({ ...item, ...preferences.get(item.name), custom: false }))
      .filter((item) => !item.hidden);
    const custom = activityTypePrefs
      .filter((item) => !defaultActivityTypes.some((base) => base.name === item.name) && !item.hidden)
      .map((item) => ({ ...item, custom: true }));
    return [...defaults, ...custom];
  }, [activityTypePrefs]);

  const activityFilterOptions = useMemo(
    () => Array.from(new Set([...activityTypes.map((item) => item.name), ...activities.map((item) => item.type)])),
    [activityTypes, activities],
  );

  const completedThisMonth = useMemo(() => {
    const now = new Date();
    return activities.filter(
      (item) => item.status === "completed" && samePeriod(item.activityDate, "month", now),
    ).length;
  }, [activities]);

  const calendarDays = useMemo(() => {
    const first = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const mondayIndex = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - mondayIndex);
    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [calendarMonth]);

  const activityHistory = useMemo(
    () =>
      activities.filter(
        (item) =>
          item.status !== "scheduled" &&
          (activityFilter === "Totes" || item.type === activityFilter) &&
          samePeriod(item.activityDate, activityPeriod, activityAnchor),
      ),
    [activities, activityFilter, activityPeriod, activityAnchor],
  );

  const activityChart = useMemo(
    () =>
      Array.from(new Set(activityHistory.filter((item) => item.status === "completed").map((item) => item.type)))
        .map((type) => ({
          name: type === "Cinta de córrer" ? "Cinta" : type,
          total: activityHistory.filter((item) => item.status === "completed" && item.type === type).length,
          fill: definitionFor(type, activityTypes).color,
        }))
        .filter((item) => item.total > 0),
    [activityHistory, activityTypes],
  );

  const filteredWeights = useMemo(
    () =>
      weights
        .filter((item) => samePeriod(item.measuredAt, weightPeriod, weightAnchor))
        .slice()
        .reverse(),
    [weights, weightPeriod, weightAnchor],
  );

  const latestWeight = weights[0];
  const previousWeight = weights[1];
  const weightDifference =
    latestWeight && previousWeight ? latestWeight.weight - previousWeight.weight : null;

  async function addActivity() {
    if (!activityType || !activityTypes.some((item) => item.name === activityType)) {
      setError("Tria una activitat abans de desar.");
      return;
    }
    const saved = await postData({
      action: editingScheduleId ? "editActivity" : "addActivity",
      id: editingScheduleId,
      type: activityType,
      activityDate: selectedDate,
      startTime: activityTime || null,
      status: editingScheduleId ? "scheduled" : alreadyDone ? "completed" : "scheduled",
    });
    if (saved) {
      setActivityOpen(false);
      setEditingScheduleId(null);
      setActivityTime("");
      setAlreadyDone(false);
    }
  }

  async function updateActivity(id: number, status: "scheduled" | "completed" | "cancelled") {
    await postData({ action: "updateActivity", id, status });
  }

  async function reactivateActivity(id: number) {
    await postData({ action: "updateActivity", id, status: "scheduled" });
  }

  async function deleteActivity(id: number) {
    await postData({ action: "deleteActivity", id });
  }

  async function confirmPendingAction() {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    if (action.kind === "delete") {
      await deleteActivity(action.activity.id);
    } else if (action.kind === "cancel") {
      await updateActivity(action.activity.id, "cancelled");
    } else {
      await reactivateActivity(action.activity.id);
    }
  }

  async function saveActivityType() {
    const name = newActivityName.trim();
    if (!name) {
      setError("Escriu el nom de la nova activitat.");
      return;
    }
    if (name !== editingActivityName && activityTypes.some((item) => item.name === name)) {
      setError("Ja tens una activitat amb aquest nom.");
      return;
    }
    const saved = await postData({
      action: "saveActivityType",
      name,
      originalName: editingActivityName,
      iconKey: newActivityIcon,
      color: newActivityColor,
    });
    if (saved) {
      setActivityType(name);
      setNewActivityOpen(false);
      setNewActivityName("");
      setEditingActivityName(null);
    }
  }

  async function deleteActivityType(definition: ActivityTypeDef) {
    const saved = await postData({
      action: "deleteActivityType",
      name: definition.name,
      iconKey: definition.iconKey,
      color: definition.color,
    });
    if (saved && activityType === definition.name) {
      const next = activityTypes.find((item) => item.name !== definition.name);
      setActivityType(next?.name ?? "");
    }
  }

  async function addWeight() {
    const value = Number(weightValue.replace(",", "."));
    const saved = await postData({
      action: editingWeightId ? "editWeight" : "addWeight",
      id: editingWeightId,
      weight: value,
      measuredAt: weightDate,
    });
    if (saved) {
      setWeightOpen(false);
      setEditingWeightId(null);
      setWeightValue("");
    }
  }

  function openNewWeight() {
    setEditingWeightId(null);
    setWeightValue("");
    setWeightDate(today);
    setWeightOpen(true);
  }

  function openWeightEditor(weight: WeightRecord) {
    setEditingWeightId(weight.id);
    setWeightValue(String(weight.weight).replace(".", ","));
    setWeightDate(weight.measuredAt);
    setWeightOpen(true);
  }

  async function deleteWeight(id: number) {
    const deleted = await postData({ action: "deleteWeight", id });
    if (deleted) setPendingWeightDelete(null);
  }

  function openActivityFor(date: string) {
    setEditingScheduleId(null);
    setSelectedDate(date);
    setActivityTime("");
    setAlreadyDone(false);
    if (!activityTypes.some((item) => item.name === activityType)) {
      setActivityType(activityTypes[0]?.name ?? "");
    }
    const parsed = parseIso(date);
    setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    setActivityOpen(true);
  }

  function openScheduleEditor(activity: ActivityRecord) {
    if (activity.status !== "scheduled") return;
    setEditingScheduleId(activity.id);
    setSelectedDate(activity.activityDate);
    setActivityType(activity.type);
    setActivityTime(activity.startTime ?? "");
    setAlreadyDone(false);
    const parsed = parseIso(activity.activityDate);
    setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    setActivityOpen(true);
  }

  function openNewActivityType() {
    setEditingActivityName(null);
    setNewActivityName("");
    setNewActivityIcon("sparkles");
    setNewActivityColor("#17a673");
    setNewActivityOpen(true);
  }

  function openActivityTypeEditor(definition: ActivityTypeDef) {
    setEditingActivityName(definition.name);
    setNewActivityName(definition.name);
    setNewActivityIcon(definition.iconKey);
    setNewActivityColor(definition.color);
    setNewActivityOpen(true);
  }

  function moveAnchor(
    setter: (date: Date) => void,
    anchor: Date,
    period: Period,
    amount: number,
  ) {
    const next = new Date(anchor);
    if (period === "month") next.setMonth(next.getMonth() + amount);
    if (period === "year") next.setFullYear(next.getFullYear() + amount);
    setter(next);
  }

  function periodLabel(period: Period, anchor: Date) {
    if (period === "all") return "Tot el temps";
    if (period === "year") return String(anchor.getFullYear());
    return `${monthNames[anchor.getMonth()]} ${anchor.getFullYear()}`;
  }

  return (
    <Tabs value={view} onValueChange={(value) => setView(value as View)} className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">{view === "today" ? "Bon dia, Anna" : "Activa’t"}</p>
          <h1>
            {view === "today" && "Avui"}
            {view === "calendar" && "Calendari"}
            {view === "activity" && "La teva activitat"}
            {view === "weight" && "El teu pes"}
          </h1>
        </div>
        <div className="brand-mark" aria-hidden="true"><Sparkles /></div>
      </header>

      {error && (
        <div className="error-banner" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setError("")} aria-label="Tancar avís"><X /></button>
        </div>
      )}

      {loading ? (
        <main className="content"><div className="loading-card">Carregant les teves dades…</div></main>
      ) : (
        <>
          <TabsContent value="today" className="content page-stack">
            <section className="motivation-banner">
              <div className="motivation-icon"><Zap /></div>
              <div><span>EL MOVIMENT SUMA</span><strong>Avui també compta.</strong></div>
              <div className="month-score"><b>{completedThisMonth}</b><small>aquest mes</small></div>
            </section>
            {nextActivity ? (
              <section className="upcoming-carousel">
                {upcomingDayActivities.length > 1 && (
                  <div className="activity-carousel-toolbar" aria-label="Activitats del mateix dia">
                    <div>
                      <span>{upcomingDayActivities.length} activitats</span>
                      <strong>{longDate(nextActivity.activityDate)}</strong>
                    </div>
                    <div className="activity-carousel-controls">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Activitat anterior"
                        disabled={carouselIndex === 0}
                        onClick={() => setCarouselIndex((index) => Math.max(0, index - 1))}
                      ><ChevronLeft /></Button>
                      <span>{carouselIndex + 1} / {upcomingDayActivities.length}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Activitat següent"
                        disabled={carouselIndex === upcomingDayActivities.length - 1}
                        onClick={() => setCarouselIndex((index) => Math.min(upcomingDayActivities.length - 1, index + 1))}
                      ><ChevronRight /></Button>
                    </div>
                  </div>
                )}
                <SwipeableShell
                  className="hero-swipe"
                  disabled={busy}
                  onDelete={() => setPendingAction({ kind: "delete", activity: nextActivity })}
                  onSecondary={() => setPendingAction({ kind: "cancel", activity: nextActivity })}
                  onOpen={() => openScheduleEditor(nextActivity)}
                >
                  <section
                    className="hero-card"
                    style={{
                      "--activity-color": definitionFor(nextActivity.type, activityTypes).color,
                    } as CSSProperties}
                  >
                    <div
                      className="hero-orb"
                      style={{ color: definitionFor(nextActivity.type, activityTypes).color }}
                    >
                      <ActivityGlyph
                        type={nextActivity.type}
                        iconKey={definitionFor(nextActivity.type, activityTypes).iconKey}
                      />
                    </div>
                    <p className="card-kicker">PROPERA ACTIVITAT</p>
                    <h2>{nextActivity.type}</h2>
                    <p className="hero-date">
                      {longDate(nextActivity.activityDate)}
                      {nextActivity.startTime ? ` · ${nextActivity.startTime} h` : ""}
                    </p>
                    <div className="hero-actions">
                      <Button
                        size="lg"
                        className="complete-button"
                        disabled={busy}
                        onClick={() => void updateActivity(nextActivity.id, "completed")}
                      >
                        <Check /> Marcar com a feta
                      </Button>
                    </div>
                  </section>
                </SwipeableShell>
                {upcomingDayActivities.length > 1 && (
                  <div className="activity-carousel-dots" aria-label="Selecciona una activitat">
                    {upcomingDayActivities.map((item, index) => (
                      <button
                        type="button"
                        key={item.id}
                        className={index === carouselIndex ? "active" : ""}
                        aria-label={`Veure ${item.type}${item.startTime ? ` a les ${item.startTime}` : ""}`}
                        aria-current={index === carouselIndex ? "true" : undefined}
                        onClick={() => setCarouselIndex(index)}
                      />
                    ))}
                  </div>
                )}
                <p className="swipe-help"><span>→ Esborrar</span><span>← Cancel·lar</span></p>
              </section>
            ) : (
              <section className="hero-card hero-empty-card">
                <div className="hero-orb"><Activity /></div>
                <p className="card-kicker">PROPERA ACTIVITAT</p>
                <div className="empty-hero">
                  <h2>Cap activitat pendent</h2>
                  <p>Quan en programis una, la trobaràs aquí.</p>
                  <Button size="lg" onClick={() => openActivityFor(today)}><Plus /> Afegir activitat</Button>
                </div>
              </section>
            )}

            <section className="today-grid">
              <button type="button" className="metric-card clickable" onClick={() => setView("activity")}>
                <span className="metric-icon"><Activity /></span>
                <span className="metric-label">Aquest mes</span>
                <strong>{completedThisMonth}</strong>
                <span className="metric-foot">activitats fetes</span>
              </button>
              <button type="button" className="metric-card clickable" onClick={() => setView("weight")}>
                <span className="metric-icon"><Scale /></span>
                <span className="metric-label">Últim pes</span>
                <strong>{latestWeight ? formatWeight(latestWeight.weight) : "—"} <small>kg</small></strong>
                <span className="metric-foot">
                  {latestWeight ? shortDate(latestWeight.measuredAt) : "Encara sense registres"}
                </span>
              </button>
            </section>

            <Button size="lg" className="wide-add" onClick={() => openActivityFor(today)}>
              <Plus /> Afegir una activitat
            </Button>
          </TabsContent>

          <TabsContent value="calendar" className="content page-stack">
            <section className="calendar-card">
              <div className="calendar-header">
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Mes anterior"
                  onClick={() =>
                    setCalendarMonth(
                      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1),
                    )
                  }
                ><ChevronLeft /></Button>
                <h2>{monthNames[calendarMonth.getMonth()]} <span>{calendarMonth.getFullYear()}</span></h2>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  aria-label="Mes següent"
                  onClick={() =>
                    setCalendarMonth(
                      new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1),
                    )
                  }
                ><ChevronRight /></Button>
              </div>
              <div className="calendar-grid week-row">
                {weekDays.map((day) => <span key={day}>{day}</span>)}
              </div>
              <div className="calendar-grid days-grid">
                {calendarDays.map((date) => {
                  const iso = localIso(date);
                  const entries = activities.filter((item) => item.activityDate === iso);
                  const inMonth = date.getMonth() === calendarMonth.getMonth();
                  return (
                    <button
                      type="button"
                      key={iso}
                      className={[
                        "day-cell",
                        inMonth ? "" : "outside",
                        iso === today ? "today" : "",
                        iso === selectedDate ? "selected" : "",
                      ].join(" ")}
                      onClick={() => {
                        setSelectedDate(iso);
                        if (!inMonth) {
                          setCalendarMonth(new Date(date.getFullYear(), date.getMonth(), 1));
                        }
                      }}
                      onDoubleClick={() => openActivityFor(iso)}
                      aria-label={longDate(iso)}
                    >
                      <span>{date.getDate()}</span>
                      <div className="day-dots">
                        {entries.slice(0, 3).map((entry) => (
                          <i
                            key={entry.id}
                            style={{ background: entry.status === "cancelled" ? "#b8b8b0" : definitionFor(entry.type, activityTypes).color }}
                          />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="selected-day">
              <div>
                <p className="card-kicker">DIA SELECCIONAT</p>
                <h3>{longDate(selectedDate)}</h3>
              </div>
              <Button size="lg" onClick={() => openActivityFor(selectedDate)}><Plus /> Afegir</Button>
            </section>

            <div className="day-agenda">
              {activities.filter((item) => item.activityDate === selectedDate).length === 0 ? (
                <p className="empty-copy">No hi ha cap activitat aquest dia.</p>
              ) : (
                activities
                  .filter((item) => item.activityDate === selectedDate)
                  .map((item) =>
                    item.status === "scheduled" ? (
                      <SwipeableShell
                        key={item.id}
                        disabled={busy}
                        onDelete={() => setPendingAction({ kind: "delete", activity: item })}
                        onSecondary={() => setPendingAction({ kind: "cancel", activity: item })}
                        onOpen={() => openScheduleEditor(item)}
                      >
                        <ActivityRow item={item} definition={definitionFor(item.type, activityTypes)} />
                      </SwipeableShell>
                    ) : item.status === "cancelled" ? (
                      <SwipeableShell
                        key={item.id}
                        disabled={busy}
                        onDelete={() => setPendingAction({ kind: "delete", activity: item })}
                        onSecondary={() => setPendingAction({ kind: "reactivate", activity: item })}
                        secondaryLabel="Activar"
                      >
                        <ActivityRow item={item} definition={definitionFor(item.type, activityTypes)} />
                      </SwipeableShell>
                    ) : (
                      <SwipeableShell
                        key={item.id}
                        disabled={busy}
                        onDelete={() => setPendingAction({ kind: "delete", activity: item })}
                        onSecondary={() => setPendingAction({ kind: "reactivate", activity: item })}
                        secondaryLabel="Fer pendent"
                      >
                        <ActivityRow item={item} definition={definitionFor(item.type, activityTypes)} />
                      </SwipeableShell>
                    ),
                  )
              )}
            </div>
            {activities.some((item) => item.activityDate === selectedDate && item.status === "scheduled") && (
              <p className="swipe-help"><span>→ Esborrar</span><span>← Cancel·lar</span></p>
            )}
          </TabsContent>

          <TabsContent value="activity" className="content page-stack">
            <section className="activity-catalog">
              <div className="section-heading catalog-heading">
                <div><p className="card-kicker">LES TEVES ACTIVITATS</p><h2>Què et ve de gust fer?</h2></div>
                <Button variant="outline" onClick={openNewActivityType}><Plus /> Nova</Button>
              </div>
              <div className="activity-type-grid">
                {activityTypes.map((definition) => (
                  <div
                    className="activity-type-card"
                    key={definition.name}
                    style={{ "--activity-color": definition.color } as CSSProperties}
                  >
                    <button
                      type="button"
                      className="type-card-main"
                      onClick={() => openActivityTypeEditor(definition)}
                    >
                      <span className="activity-type-icon"><ActivityGlyph type={definition.name} iconKey={definition.iconKey} /></span>
                      <strong>{definition.name}</strong>
                    </button>
                    <button
                      type="button"
                      className="remove-type"
                      aria-label={`Esborrar ${definition.name}`}
                      onClick={() => void deleteActivityType(definition)}
                    ><X /></button>
                  </div>
                ))}
              </div>
            </section>

            <section className="filter-panel">
              <div className="filter-field">
                <Label>Tipus d’activitat</Label>
                <Select value={activityFilter} onValueChange={setActivityFilter}>
                  <SelectTrigger className="large-select"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Totes">Totes les activitats</SelectItem>
                    {activityFilterOptions.map((type) => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <PeriodPicker
                period={activityPeriod}
                anchor={activityAnchor}
                label={periodLabel(activityPeriod, activityAnchor)}
                onPeriod={setActivityPeriod}
                onMove={(amount) => moveAnchor(setActivityAnchor, activityAnchor, activityPeriod, amount)}
              />
            </section>

            <section className="summary-strip">
              <div><strong>{activityHistory.filter((item) => item.status === "completed").length}</strong><span>fetes</span></div>
              <div><strong>{activityHistory.filter((item) => item.status === "cancelled").length}</strong><span>cancel·lades</span></div>
              <div><strong>{new Set(activityHistory.filter((item) => item.status === "completed").map((item) => item.type)).size}</strong><span>tipus</span></div>
            </section>

            <section className="chart-card">
              <div className="section-heading">
                <div><p className="card-kicker">RESUM</p><h2>Activitats fetes</h2></div>
              </div>
              {activityChart.length ? (
                <div className="activity-chart" aria-label="Gràfic d’activitats fetes">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityChart} margin={{ top: 12, right: 4, left: -24, bottom: 4 }}>
                      <CartesianGrid vertical={false} stroke="#dce8df" />
                      <XAxis dataKey="name" tick={{ fill: "#52665b", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fill: "#52665b", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip cursor={{ fill: "#eef5ef" }} />
                      <Bar dataKey="total" radius={[8, 8, 2, 2]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState text="Encara no hi ha activitats fetes en aquest període." />
              )}
            </section>

            <section className="history-section">
              <div className="section-heading"><div><p className="card-kicker">HISTORIAL</p><h2>Registre d’activitats</h2></div></div>
              <div className="history-list">
                {activityHistory.length ? (
                  activityHistory.map((item) =>
                    item.status === "cancelled" ? (
                      <SwipeableShell
                        key={item.id}
                        disabled={busy}
                        onDelete={() => setPendingAction({ kind: "delete", activity: item })}
                        onSecondary={() => setPendingAction({ kind: "reactivate", activity: item })}
                        secondaryLabel="Activar"
                      >
                        <ActivityRow item={item} definition={definitionFor(item.type, activityTypes)} />
                      </SwipeableShell>
                    ) : (
                      <ActivityRow key={item.id} item={item} definition={definitionFor(item.type, activityTypes)} />
                    ),
                  )
                ) : (
                  <EmptyState text="No hi ha cap activitat amb aquests filtres." />
                )}
              </div>
            </section>
          </TabsContent>

          <TabsContent value="weight" className="content page-stack">
            <section className="weight-hero">
              <div>
                <p className="card-kicker">ÚLTIM REGISTRE</p>
                <h2>{latestWeight ? formatWeight(latestWeight.weight) : "—"} <span>kg</span></h2>
                <p>{latestWeight ? shortDate(latestWeight.measuredAt) : "Encara no has afegit cap pes"}</p>
              </div>
              <div className={`trend-pill ${weightDifference && weightDifference > 0 ? "up" : ""}`}>
                {weightDifference === null
                  ? "Sense comparativa"
                  : `${weightDifference > 0 ? "+" : ""}${formatWeight(weightDifference)} kg`}
              </div>
              <Button size="lg" className="weight-add" onClick={openNewWeight}>
                <Plus /> Registrar pes
              </Button>
            </section>

            <section className="filter-panel single">
              <PeriodPicker
                period={weightPeriod}
                anchor={weightAnchor}
                label={periodLabel(weightPeriod, weightAnchor)}
                onPeriod={setWeightPeriod}
                onMove={(amount) => moveAnchor(setWeightAnchor, weightAnchor, weightPeriod, amount)}
              />
            </section>

            <section className="chart-card">
              <div className="section-heading"><div><p className="card-kicker">EVOLUCIÓ</p><h2>Històric del pes</h2></div></div>
              {filteredWeights.length ? (
                <div className="weight-chart" aria-label="Gràfic d’evolució del pes">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={filteredWeights} margin={{ top: 14, right: 10, left: -8, bottom: 2 }}>
                      <CartesianGrid vertical={false} stroke="#dce8df" />
                      <XAxis
                        dataKey="measuredAt"
                        tickFormatter={(value) => {
                          const date = parseIso(value);
                          return `${date.getDate()}/${date.getMonth() + 1}`;
                        }}
                        tick={{ fill: "#52665b", fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis domain={["dataMin - 1", "dataMax + 1"]} tick={{ fill: "#52665b", fontSize: 12 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        labelFormatter={(value) => shortDate(String(value))}
                        formatter={(value) => [`${formatWeight(Number(value))} kg`, "Pes"]}
                      />
                      <Line type="monotone" dataKey="weight" stroke="#1f7a5c" strokeWidth={3} dot={{ r: 4, fill: "#f8fbf7", strokeWidth: 3 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyState text="Encara no hi ha registres de pes en aquest període." />
              )}
            </section>

            <section className="history-section">
              <div className="section-heading"><div><p className="card-kicker">REGISTRES</p><h2>Pes per data</h2></div></div>
              <div className="weight-list">
                {[...filteredWeights].reverse().map((item, index, list) => {
                  const previous = list[index + 1];
                  const diff = previous ? item.weight - previous.weight : null;
                  return (
                    <SwipeableShell
                      key={item.id}
                      className="weight-swipe"
                      disabled={busy}
                      onDelete={() => setPendingWeightDelete(item)}
                      onOpen={() => openWeightEditor(item)}
                    >
                      <div className="weight-row">
                        <span className="weight-row-icon"><Scale /></span>
                        <div><strong>{formatWeight(item.weight)} kg</strong><span>{shortDate(item.measuredAt)}</span></div>
                        <em className={diff && diff > 0 ? "up" : ""}>
                          {diff === null ? "—" : `${diff > 0 ? "+" : ""}${formatWeight(diff)}`}
                        </em>
                      </div>
                    </SwipeableShell>
                  );
                })}
                {!filteredWeights.length && <EmptyState text="No hi ha cap pes amb aquest filtre." />}
              </div>
              {filteredWeights.length > 0 && <p className="swipe-help weight-swipe-help"><span>→ Esborrar</span></p>}
            </section>
          </TabsContent>
        </>
      )}

      <TabsList className="bottom-nav" aria-label="Navegació principal">
        <TabsTrigger value="today"><Sparkles /><span>Avui</span></TabsTrigger>
        <TabsTrigger value="calendar"><CalendarDays /><span>Calendari</span></TabsTrigger>
        <TabsTrigger value="activity"><Activity /><span>Activitat</span></TabsTrigger>
        <TabsTrigger value="weight"><Scale /><span>Pes</span></TabsTrigger>
      </TabsList>

      <Dialog
        open={activityOpen}
        onOpenChange={(open) => {
          setActivityOpen(open);
          if (!open) setEditingScheduleId(null);
        }}
      >
        <DialogContent className="form-dialog activity-dialog">
          <DialogHeader className="activity-dialog-header">
            <DialogTitle>{editingScheduleId ? "Editar activitat programada" : "Afegir activitat"}</DialogTitle>
            <DialogDescription>
              {editingScheduleId
                ? "Modifica l’activitat o la seva hora d’inici."
                : "Programa-la o registra-la directament com a feta."}
            </DialogDescription>
          </DialogHeader>
          <div className="dialog-scroll-body">
            <div className="form-stack">
              <div className="selected-date-field compact-date">
                <CalendarDays />
                <strong>{longDate(selectedDate)}</strong>
              </div>
              <div className="form-field">
                <Label>Activitat</Label>
                <div className="activity-picker-grid">
                  {activityTypes.map((definition) => (
                    <button
                      type="button"
                      key={definition.name}
                      className={activityType === definition.name ? "selected" : ""}
                      style={{ "--activity-color": definition.color } as CSSProperties}
                      onClick={() => setActivityType(definition.name)}
                    >
                      <span><ActivityGlyph type={definition.name} iconKey={definition.iconKey} /></span>
                      <strong>{definition.name}</strong>
                    </button>
                  ))}
                </div>
              </div>
              <div className="form-field">
                <Label htmlFor="activity-time">Hora d’inici <span>(opcional)</span></Label>
                <div className="time-input-wrap">
                  <Input id="activity-time" type="time" value={activityTime} onChange={(event) => setActivityTime(event.target.value)} />
                  {activityTime && (
                    <button type="button" onClick={() => setActivityTime("")} aria-label="Esborrar l’hora">
                      <X />
                    </button>
                  )}
                </div>
              </div>
              {!editingScheduleId && (
                <label className="check-card">
                  <Checkbox checked={alreadyDone} onCheckedChange={(checked) => setAlreadyDone(checked === true)} />
                  <span><strong>Ja l’he feta</strong><small>S’afegirà a l’historial i no sortirà a Avui.</small></span>
                </label>
              )}
            </div>
          </div>
          <DialogFooter className="activity-dialog-footer">
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setActivityOpen(false);
                setEditingScheduleId(null);
              }}
            >Cancel·lar</Button>
            <Button size="lg" disabled={busy || !activityType || !activityTypes.length} onClick={() => void addActivity()}>
              {busy ? "Desant…" : editingScheduleId ? "Desar canvis" : "Desar activitat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={newActivityOpen}
        onOpenChange={(open) => {
          setNewActivityOpen(open);
          if (!open) setEditingActivityName(null);
        }}
      >
        <DialogContent className="form-dialog new-type-dialog">
          <DialogHeader>
            <DialogTitle>{editingActivityName ? "Editar activitat" : "Nova activitat"}</DialogTitle>
            <DialogDescription>
              {editingActivityName
                ? "Canvia el nom, el dibuix o el color que la representen."
                : "Posa-li un nom i tria el dibuix i el color que la representaran."}
            </DialogDescription>
          </DialogHeader>
          <div className="form-stack">
            <div className="form-field">
              <Label htmlFor="new-activity-name">Nom</Label>
              <Input
                id="new-activity-name"
                placeholder="Per exemple, Pilates"
                maxLength={36}
                value={newActivityName}
                onChange={(event) => setNewActivityName(event.target.value)}
              />
            </div>
            <div className="form-field">
              <Label>Dibuix</Label>
              <div className="icon-choice-grid">
                {iconOptions.map((icon) => (
                  <button
                    type="button"
                    key={icon}
                    className={newActivityIcon === icon ? "selected" : ""}
                    onClick={() => setNewActivityIcon(icon)}
                    aria-label={`Dibuix ${icon}`}
                  ><ActivityGlyph iconKey={icon} /></button>
                ))}
              </div>
            </div>
            <div className="form-field">
              <Label>Color</Label>
              <div className="color-choice-grid">
                {colorOptions.map((color) => (
                  <button
                    type="button"
                    key={color}
                    className={newActivityColor === color ? "selected" : ""}
                    style={{ background: color }}
                    onClick={() => setNewActivityColor(color)}
                    aria-label={`Color ${color}`}
                  >{newActivityColor === color && <Check />}</button>
                ))}
              </div>
            </div>
            <div className="type-preview" style={{ "--activity-color": newActivityColor } as CSSProperties}>
              <span><ActivityGlyph iconKey={newActivityIcon} /></span>
              <strong>{newActivityName || "La teva activitat"}</strong>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="lg" onClick={() => setNewActivityOpen(false)}>Cancel·lar</Button>
            <Button size="lg" disabled={busy || !newActivityName.trim()} onClick={() => void saveActivityType()}>
              {busy ? "Desant…" : editingActivityName ? "Desar canvis" : "Crear activitat"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={weightOpen}
        onOpenChange={(open) => {
          setWeightOpen(open);
          if (!open) setEditingWeightId(null);
        }}
      >
        <DialogContent className="form-dialog">
          <DialogHeader>
            <DialogTitle>{editingWeightId ? "Editar el pes" : "Registrar el pes"}</DialogTitle>
            <DialogDescription>
              {editingWeightId ? "Modifica el pes o la data del registre." : "Afegeix una nova mesura al teu històric."}
            </DialogDescription>
          </DialogHeader>
          <div className="form-stack">
            <div className="form-field">
              <Label htmlFor="weight-value">Pes en kg</Label>
              <div className="weight-input-wrap">
                <Input
                  id="weight-value"
                  inputMode="decimal"
                  placeholder="65,0"
                  value={weightValue}
                  onChange={(event) => setWeightValue(event.target.value)}
                />
                <span>kg</span>
              </div>
            </div>
            <div className="form-field">
              <Label htmlFor="weight-date">Data</Label>
              <Input id="weight-date" type="date" value={weightDate} max={today} onChange={(event) => setWeightDate(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                setWeightOpen(false);
                setEditingWeightId(null);
              }}
            >Cancel·lar</Button>
            <Button size="lg" disabled={busy || !weightValue} onClick={() => void addWeight()}>
              {busy ? "Desant…" : editingWeightId ? "Desar canvis" : "Desar pes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
        <AlertDialogContent className="confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.kind === "delete"
                ? "Esborrar l’activitat?"
                : pendingAction?.kind === "reactivate"
                  ? pendingAction.activity.status === "completed"
                    ? "Tornar a posar l’activitat pendent?"
                    : "Tornar a activar l’activitat?"
                  : "Cancel·lar l’activitat?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.kind === "delete"
                ? `S’eliminarà ${pendingAction.activity.type} del ${shortDate(pendingAction.activity.activityDate)}. Aquesta acció no es pot desfer.`
                : pendingAction?.kind === "reactivate"
                  ? pendingAction.activity.status === "completed"
                    ? "Deixarà de constar com a feta i tornarà a aparèixer entre les activitats programades."
                    : "Tornarà a quedar pendent i apareixerà de nou entre les activitats programades."
                  : "Quedarà registrada com a cancel·lada i la podràs tornar a activar més endavant."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tornar</AlertDialogCancel>
            <AlertDialogAction
              variant={pendingAction?.kind === "delete" ? "destructive" : "default"}
              onClick={() => void confirmPendingAction()}
            >
              {pendingAction?.kind === "delete"
                ? "Sí, esborrar"
                : pendingAction?.kind === "reactivate"
                  ? pendingAction.activity.status === "completed" ? "Sí, fer pendent" : "Sí, activar"
                  : "Sí, cancel·lar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={pendingWeightDelete !== null} onOpenChange={(open) => !open && setPendingWeightDelete(null)}>
        <AlertDialogContent className="confirm-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Esborrar el registre de pes?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingWeightDelete
                ? `S’eliminarà el registre de ${formatWeight(pendingWeightDelete.weight)} kg del ${shortDate(pendingWeightDelete.measuredAt)}. Aquesta acció no es pot desfer.`
                : "Aquesta acció no es pot desfer."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Tornar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={busy}
              onClick={() => pendingWeightDelete && void deleteWeight(pendingWeightDelete.id)}
            >Sí, esborrar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Tabs>
  );
}

function PeriodPicker({
  period,
  anchor,
  label,
  onPeriod,
  onMove,
}: {
  period: Period;
  anchor: Date;
  label: string;
  onPeriod: (period: Period) => void;
  onMove: (amount: number) => void;
}) {
  void anchor;
  return (
    <div className="period-picker">
      <div className="period-options">
        {([
          ["all", "Tot"],
          ["month", "Mes"],
          ["year", "Any"],
        ] as const).map(([value, text]) => (
          <button
            type="button"
            key={value}
            className={period === value ? "active" : ""}
            onClick={() => onPeriod(value)}
          >
            {text}
          </button>
        ))}
      </div>
      {period !== "all" && (
        <div className="period-nav">
          <Button variant="ghost" size="icon-sm" aria-label="Període anterior" onClick={() => onMove(-1)}><ChevronLeft /></Button>
          <strong>{label}</strong>
          <Button variant="ghost" size="icon-sm" aria-label="Període següent" onClick={() => onMove(1)}><ChevronRight /></Button>
        </div>
      )}
    </div>
  );
}

function SwipeableShell({
  children,
  onDelete,
  onSecondary,
  onOpen,
  secondaryLabel = "Cancel·lar",
  disabled = false,
  className = "",
}: {
  children: ReactNode;
  onDelete: () => void;
  onSecondary?: () => void;
  onOpen?: () => void;
  secondaryLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  const startX = useRef<number | null>(null);
  const offsetRef = useRef(0);
  const draggedRef = useRef(false);
  const [offset, setOffset] = useState(0);

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (disabled) return;
    startX.current = event.clientX;
    draggedRef.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (startX.current === null || disabled) return;
    const minimum = onSecondary ? -110 : 0;
    const rawDistance = event.clientX - startX.current;
    const distance = Math.max(minimum, Math.min(110, rawDistance));
    if (Math.abs(rawDistance) > 6) draggedRef.current = true;
    offsetRef.current = distance;
    setOffset(distance);
  }

  function finishSwipe() {
    if (startX.current === null) return;
    startX.current = null;
    if (offsetRef.current > 72) {
      offsetRef.current = 120;
      setOffset(120);
      window.setTimeout(() => {
        offsetRef.current = 0;
        setOffset(0);
        onDelete();
      }, 120);
    } else if (onSecondary && offsetRef.current < -72) {
      offsetRef.current = -120;
      setOffset(-120);
      window.setTimeout(() => {
        offsetRef.current = 0;
        setOffset(0);
        onSecondary();
      }, 120);
    } else {
      offsetRef.current = 0;
      setOffset(0);
    }
  }

  return (
    <div className={`swipe-shell ${onSecondary ? "" : "delete-only"} ${className}`}>
      <button type="button" className="swipe-action delete" onClick={onDelete}>Esborrar</button>
      {onSecondary && <button type="button" className="swipe-action cancel" onClick={onSecondary}>{secondaryLabel}</button>}
      <div
        className={`swipe-content ${onOpen ? "is-editable" : ""}`}
        style={{ transform: `translateX(${offset}px)` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishSwipe}
        onPointerCancel={() => {
          startX.current = null;
          offsetRef.current = 0;
          draggedRef.current = false;
          setOffset(0);
        }}
        onClick={(event) => {
          if (!onOpen) return;
          if (draggedRef.current) {
            draggedRef.current = false;
            return;
          }
          if ((event.target as HTMLElement).closest("button, input, label, a")) return;
          onOpen();
        }}
      >
        {children}
      </div>
    </div>
  );
}

function ActivityRow({ item, definition }: { item: ActivityRecord; definition?: ActivityTypeDef }) {
  const currentDefinition = definition ?? definitionFor(item.type, defaultActivityTypes);
  return (
    <article className="activity-row">
      <span className="activity-row-icon" style={{ background: `${currentDefinition.color}1f`, color: currentDefinition.color }}><ActivityGlyph type={item.type} iconKey={currentDefinition.iconKey} /></span>
      <div className="activity-row-main">
        <strong>{item.type}</strong>
        <span>{shortDate(item.activityDate)}{item.startTime ? ` · ${item.startTime} h` : ""}</span>
      </div>
      <span className={`status-badge ${item.status}`}>
        {item.status === "completed" && "Feta"}
        {item.status === "cancelled" && "Cancel·lada"}
        {item.status === "scheduled" && "Pendent"}
      </span>
    </article>
  );
}

function EmptyState({ text }: { text: string }) {
  return <div className="empty-state"><span><Activity /></span><p>{text}</p></div>;
}
