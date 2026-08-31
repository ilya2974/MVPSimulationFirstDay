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
  if (typeof req.body?.eventType !== "string") { res.status(400).json({ message: "Поле eventType обязательно." }); return; }
  await db.insert(simulationEvents).values({ id: randomUUID(), participantId, eventType: req.body.eventType, payload: req.body.payload ?? {}, createdAt: new Date() });
  res.status(201).json({ ok: true });
});

export default router;
