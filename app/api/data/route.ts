import { env } from "cloudflare:workers";

type ActivityPayload = {
  action?: "addActivity" | "updateActivity" | "deleteActivity" | "addWeight" | "saveActivityType" | "deleteActivityType";
  id?: number;
  type?: string;
  activityDate?: string;
  startTime?: string | null;
  status?: "scheduled" | "completed" | "cancelled";
  weight?: number;
  measuredAt?: string;
  name?: string;
  iconKey?: string;
  color?: string;
};

function ownerFrom(request: Request) {
  return request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase() ?? "";
}

function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Error inesperat";
  return message.includes("no such table")
    ? "La base de dades encara no està preparada. Torna-ho a provar d’aquí a un moment."
    : message;
}

export async function GET(request: Request) {
  const ownerKey = ownerFrom(request);
  if (!ownerKey) return Response.json({ error: "Cal iniciar sessió amb OpenAI." }, { status: 401 });

  try {
    const [activitiesResult, activityTypesResult, weightsResult] = await env.DB.batch([
      env.DB.prepare(
        `SELECT id, type, activity_date AS activityDate, start_time AS startTime,
                status, created_at AS createdAt
         FROM activities WHERE owner_key = ?
         ORDER BY activity_date DESC, COALESCE(start_time, '23:59') DESC, id DESC`,
      ).bind(ownerKey),
      env.DB.prepare(
        `SELECT id, name, icon_key AS iconKey, color, hidden
         FROM activity_types WHERE owner_key = ?
         ORDER BY created_at ASC, id ASC`,
      ).bind(ownerKey),
      env.DB.prepare(
        `SELECT id, weight, measured_at AS measuredAt, created_at AS createdAt
         FROM weights WHERE owner_key = ?
         ORDER BY measured_at DESC, id DESC`,
      ).bind(ownerKey),
    ]);

    return Response.json({
      activities: activitiesResult.results ?? [],
      weights: weightsResult.results ?? [],
      activityTypes: activityTypesResult.results ?? [],
    });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const ownerKey = ownerFrom(request);
  if (!ownerKey) return Response.json({ error: "Cal iniciar sessió amb OpenAI." }, { status: 401 });

  try {
    const payload = (await request.json()) as ActivityPayload;

    if (payload.action === "addActivity") {
      const type = payload.type?.trim();
      const activityDate = payload.activityDate?.trim();
      const status = payload.status ?? "scheduled";
      if (!type || !activityDate || !["scheduled", "completed"].includes(status)) {
        return Response.json({ error: "Falten dades de l’activitat." }, { status: 400 });
      }
      await env.DB.prepare(
        `INSERT INTO activities (owner_key, type, activity_date, start_time, status)
         VALUES (?, ?, ?, ?, ?)`,
      ).bind(ownerKey, type, activityDate, payload.startTime || null, status).run();
    } else if (payload.action === "updateActivity") {
      if (!payload.id || !["scheduled", "completed", "cancelled"].includes(payload.status ?? "")) {
        return Response.json({ error: "Actualització no vàlida." }, { status: 400 });
      }
      await env.DB.prepare(
        "UPDATE activities SET status = ? WHERE id = ? AND owner_key = ?",
      ).bind(payload.status, payload.id, ownerKey).run();
    } else if (payload.action === "deleteActivity") {
      if (!payload.id) {
        return Response.json({ error: "No s’ha trobat l’activitat." }, { status: 400 });
      }
      await env.DB.prepare(
        "DELETE FROM activities WHERE id = ? AND owner_key = ? AND status IN ('scheduled', 'cancelled')",
      ).bind(payload.id, ownerKey).run();
    } else if (payload.action === "addWeight") {
      if (!payload.measuredAt || !payload.weight || payload.weight < 20 || payload.weight > 300) {
        return Response.json({ error: "Introdueix un pes vàlid." }, { status: 400 });
      }
      await env.DB.prepare(
        "INSERT INTO weights (owner_key, weight, measured_at) VALUES (?, ?, ?)",
      ).bind(ownerKey, payload.weight, payload.measuredAt).run();
    } else if (payload.action === "saveActivityType") {
      const name = payload.name?.trim();
      if (!name || name.length > 36) {
        return Response.json({ error: "Escriu un nom d’activitat vàlid." }, { status: 400 });
      }
      await env.DB.prepare(
        `INSERT INTO activity_types (owner_key, name, icon_key, color, hidden)
         VALUES (?, ?, ?, ?, 0)
         ON CONFLICT(owner_key, name)
         DO UPDATE SET icon_key = excluded.icon_key, color = excluded.color, hidden = 0`,
      ).bind(ownerKey, name, payload.iconKey || "sparkles", payload.color || "#65a84f").run();
    } else if (payload.action === "deleteActivityType") {
      const name = payload.name?.trim();
      if (!name) {
        return Response.json({ error: "No s’ha trobat el tipus d’activitat." }, { status: 400 });
      }
      await env.DB.prepare(
        `INSERT INTO activity_types (owner_key, name, icon_key, color, hidden)
         VALUES (?, ?, ?, ?, 1)
         ON CONFLICT(owner_key, name)
         DO UPDATE SET hidden = 1`,
      ).bind(ownerKey, name, payload.iconKey || "sparkles", payload.color || "#65a84f").run();
    } else {
      return Response.json({ error: "Acció no reconeguda." }, { status: 400 });
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
