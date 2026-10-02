import { requireSupabaseUser, supabaseConfigured } from "@/lib/supabase-request";

type ActivityPayload = { action?: string; id?: number; type?: string; activityDate?: string; startTime?: string | null; status?: "scheduled" | "completed" | "cancelled"; weight?: number; measuredAt?: string; name?: string; originalName?: string | null; iconKey?: string; color?: string };

function authError(client: unknown) { return Response.json({ error: client ? "Aquest compte de Google no està autoritzada." : "Cal iniciar sessió amb Google." }, { status: client ? 403 : 401 }); }
function mapActivities(rows: any[]) { return rows.map(row => ({ id: row.id, type: row.type, activityDate: row.activity_date, startTime: row.start_time, status: row.status, everCancelled: row.ever_cancelled, everCompleted: row.ever_completed, createdAt: row.created_at })); }
function mapWeights(rows: any[]) { return rows.map(row => ({ id: row.id, weight: row.weight, measuredAt: row.measured_at, createdAt: row.created_at })); }
function mapTypes(rows: any[]) { return rows.map(row => ({ id: row.id, name: row.name, iconKey: row.icon_key, color: row.color, hidden: row.hidden })); }

export async function GET(request: Request) {
  const { client, user } = await requireSupabaseUser(request);
  if (!supabaseConfigured || !client || !user) return authError(client);
  const [activities, weights, types] = await Promise.all([
    client.from("activa_t_activities").select("*").eq("user_id", user.id).order("activity_date", { ascending: false }).order("id", { ascending: false }),
    client.from("activa_t_weights").select("*").eq("user_id", user.id).order("measured_at", { ascending: false }).order("id", { ascending: false }),
    client.from("activa_t_activity_types").select("*").eq("user_id", user.id).order("created_at").order("id"),
  ]);
  const error = [activities, weights, types].find(result => result.error)?.error;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ activities: mapActivities(activities.data ?? []), weights: mapWeights(weights.data ?? []), activityTypes: mapTypes(types.data ?? []) });
}

export async function POST(request: Request) {
  const { client, user } = await requireSupabaseUser(request);
  if (!supabaseConfigured || !client || !user) return authError(client);
  const payload = await request.json() as ActivityPayload;
  const uid = user.id;
  let error: { message: string } | null = null;
  if (payload.action === "addActivity") {
    if (!payload.type?.trim() || !payload.activityDate || !["scheduled", "completed"].includes(payload.status ?? "scheduled")) return Response.json({ error: "Falten dades de l’activitat." }, { status: 400 });
    ({ error } = await client.from("activa_t_activities").insert({ user_id: uid, type: payload.type.trim(), activity_date: payload.activityDate, start_time: payload.startTime || null, status: payload.status ?? "scheduled", ever_completed: payload.status === "completed" }));
  } else if (payload.action === "editActivity") {
    ({ error } = await client.from("activa_t_activities").update({ type: payload.type?.trim(), activity_date: payload.activityDate, start_time: payload.startTime || null }).eq("id", payload.id).eq("user_id", uid).eq("status", "scheduled"));
  } else if (payload.action === "updateActivity") {
    if (!payload.id || !payload.status) return Response.json({ error: "Actualització no vàlida." }, { status: 400 });
    const changes = payload.status === "cancelled" ? { status: payload.status, ever_cancelled: true } : payload.status === "completed" ? { status: payload.status, ever_completed: true } : { status: payload.status };
    ({ error } = await client.from("activa_t_activities").update(changes).eq("id", payload.id).eq("user_id", uid));
  } else if (payload.action === "deleteActivity") {
    ({ error } = await client.from("activa_t_activities").delete().eq("id", payload.id).eq("user_id", uid));
  } else if (payload.action === "addWeight") {
    if (!payload.measuredAt || !payload.weight || payload.weight < 20 || payload.weight > 300) return Response.json({ error: "Introdueix un pes vàlid." }, { status: 400 });
    ({ error } = await client.from("activa_t_weights").insert({ user_id: uid, weight: payload.weight, measured_at: payload.measuredAt }));
  } else if (payload.action === "editWeight") {
    ({ error } = await client.from("activa_t_weights").update({ weight: payload.weight, measured_at: payload.measuredAt }).eq("id", payload.id).eq("user_id", uid));
  } else if (payload.action === "deleteWeight") {
    ({ error } = await client.from("activa_t_weights").delete().eq("id", payload.id).eq("user_id", uid));
  } else if (payload.action === "saveActivityType") {
    const name = payload.name?.trim();
    if (!name || name.length > 36) return Response.json({ error: "Escriu un nom d’activitat vàlid." }, { status: 400 });
    ({ error } = await client.from("activa_t_activity_types").upsert({ user_id: uid, name, icon_key: payload.iconKey || "sparkles", color: payload.color || "#65a84f", hidden: false }, { onConflict: "user_id,name" }));
    if (!error && payload.originalName && payload.originalName !== name) ({ error } = await client.from("activa_t_activities").update({ type: name }).eq("user_id", uid).eq("type", payload.originalName));
  } else if (payload.action === "deleteActivityType") {
    if (!payload.name) return Response.json({ error: "No s’ha trobat el tipus d’activitat." }, { status: 400 });
    ({ error } = await client.from("activa_t_activity_types").update({ hidden: true }).eq("user_id", uid).eq("name", payload.name));
  } else return Response.json({ error: "Acció no reconeguda." }, { status: 400 });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true }, { status: 201 });
}
