import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { participants, simulationEvents, simulationState } from "@workspace/db/schema";

const router: IRouter = Router();

router.get("/state/:participantId", async (req, res) => {
  const [row] = await db.select().from(simulationState).where(eq(simulationState.participantId, req.params.participantId));
  res.json({ data: row?.data ?? {} });
});

router.patch("/state/:participantId", async (req, res) => {
  const participantId = req.params.participantId;
  const key = typeof req.body?.key === "string" ? req.body.key : "";
  if (!key) { res.status(400).json({ message: "Поле key обязательно." }); return; }
  const [participant] = await db.select({ id: participants.id }).from(participants).where(eq(participants.id, participantId));
  if (!participant) { res.status(404).json({ message: "Участник не найден." }); return; }
  const data = { [key]: req.body.value };
  const now = new Date();
  await db.insert(simulationState).values({ participantId, data, updatedAt: now }).onConflictDoUpdate({
    target: simulationState.participantId,
    // Merge one key atomically so concurrent browser saves cannot overwrite each other.
    set: { data: sql`${simulationState.data} || ${JSON.stringify(data)}::jsonb`, updatedAt: now },
  });
  res.json({ ok: true });
});

router.post("/events/:participantId", async (req, res) => {
  const participantId = req.params.participantId;
  const { id = randomUUID(), eventType, payload = {}, createdAt } = req.body ?? {};
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuid.test(participantId) || typeof id !== "string" || !uuid.test(id)
    || typeof eventType !== "string" || !eventType.trim() || eventType.length > 100
    || !payload || typeof payload !== "object" || Array.isArray(payload)
    || (createdAt !== undefined && (typeof createdAt !== "string" || !Number.isFinite(Date.parse(createdAt))))) {
    res.status(400).json({ message: "Некорректное событие." }); return;
  }
  const [participant] = await db.select({ id: participants.id }).from(participants).where(eq(participants.id, participantId));
  if (!participant) { res.status(404).json({ message: "Участник не найден." }); return; }
  const [existing] = await db.select({ participantId: simulationEvents.participantId }).from(simulationEvents).where(eq(simulationEvents.id, id));
  if (existing && existing.participantId !== participantId) { res.status(409).json({ message: "ID события уже занят." }); return; }
  await db.insert(simulationEvents).values({ id, participantId, eventType, payload, createdAt: createdAt ? new Date(createdAt) : new Date() }).onConflictDoNothing({ target: simulationEvents.id });
  res.status(201).json({ ok: true, id });
});

export default router;
