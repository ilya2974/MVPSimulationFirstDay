import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { participants, simulationSessions, simulationState } from "@workspace/db/schema";

const router: IRouter = Router();

type Registration = {
  firstName: string;
  lastName: string;
  age: number;
  email: string;
  consent: boolean;
};

function isRegistration(value: unknown): value is Registration {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;

  const rawAge = candidate.age;
  const age = typeof rawAge === "number"
    ? rawAge
    : typeof rawAge === "string"
      ? Number(rawAge)
      : Number.NaN;

  return typeof candidate.firstName === "string"
    && candidate.firstName.trim().length >= 1
    && typeof candidate.lastName === "string"
    && candidate.lastName.trim().length >= 1
    && Number.isInteger(age)
    && age >= 16
    && age <= 75
    && typeof candidate.email === "string"
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)
    && candidate.consent === true;
}

router.post("/register", async (req, res) => {
  if (!isRegistration(req.body)) {
    res.status(400).json({ message: "Проверьте данные анкеты и согласие на обработку." });
    return;
  }

  const participantId = randomUUID();

  try {
    const now = new Date();
    await db.transaction(async (tx) => {
      await tx.insert(participants).values({
        id: participantId,
        firstName: req.body.firstName.trim(),
        lastName: req.body.lastName.trim(),
        age: req.body.age,
        email: req.body.email.trim().toLowerCase(),
        consent: req.body.consent,
        registeredAt: now,
      });
      await tx.insert(simulationSessions).values({ id: randomUUID(), participantId });
      await tx.insert(simulationState).values({ participantId, data: {}, updatedAt: now });
    });

    res.status(201).json({ participantId });
  } catch (error) {
    console.error("Registration request failed", error);
    res.status(503).json({
      code: "database_unavailable",
      message: "Сервис сохранения регистрации временно недоступен.",
    });
  }
});

export default router;
