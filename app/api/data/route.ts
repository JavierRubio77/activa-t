import { env } from "cloudflare:workers";

type ActivityPayload = {
  action?: "addActivity" | "updateActivity" | "addWeight";
  id?: number;
  type?: string;
  activityDate?: string;
  startTime?: string | null;
  status?: "scheduled" | "completed" | "cancelled";
  weight?: number;
  measuredAt?: string;
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
    const [activitiesResult, weightsResult] = await env.DB.batch([
      env.DB.prepare(
        `SELECT id, type, activity_date AS activityDate, start_time AS startTime,
                status, created_at AS createdAt
         FROM activities WHERE owner_key = ?
         ORDER BY activity_date DESC, COALESCE(start_time, '23:59') DESC, id DESC`,
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
      if (!payload.id || !["completed", "cancelled"].includes(payload.status ?? "scheduled")) {
        return Response.json({ error: "Actualització no vàlida." }, { status: 400 });
      }
      await env.DB.prepare(
        "UPDATE activities SET status = ? WHERE id = ? AND owner_key = ?",
      ).bind(payload.status, payload.id, ownerKey).run();
    } else if (payload.action === "addWeight") {
      if (!payload.measuredAt || !payload.weight || payload.weight < 20 || payload.weight > 300) {
        return Response.json({ error: "Introdueix un pes vàlid." }, { status: 400 });
      }
      await env.DB.prepare(
        "INSERT INTO weights (owner_key, weight, measured_at) VALUES (?, ?, ?)",
      ).bind(ownerKey, payload.weight, payload.measuredAt).run();
    } else {
      return Response.json({ error: "Acció no reconeguda." }, { status: 400 });
    }

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    return Response.json({ error: errorMessage(error) }, { status: 500 });
  }
}
