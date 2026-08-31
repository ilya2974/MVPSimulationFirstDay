import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { ReplitConnectors } from "@replit/connectors-sdk";

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
  return typeof candidate.firstName === "string"
    && candidate.firstName.trim().length >= 1
    && typeof candidate.lastName === "string"
    && candidate.lastName.trim().length >= 1
    && typeof candidate.age === "number"
    && Number.isInteger(candidate.age)
    && candidate.age >= 16
    && candidate.age <= 75
    && typeof candidate.email === "string"
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(candidate.email)
    && candidate.consent === true;
}

router.post("/register", async (req, res) => {
  if (!isRegistration(req.body)) {
    res.status(400).json({ message: "Проверьте данные анкеты и согласие на обработку." });
    return;
  }

  const baseId = process.env["AIRTABLE_BASE_ID"];
  const tableName = process.env["AIRTABLE_TABLE_NAME"];
  if (!baseId || !tableName) {
    res.status(503).json({ message: "Airtable не настроен: укажите AIRTABLE_BASE_ID и AIRTABLE_TABLE_NAME." });
    return;
  }

  const participantId = randomUUID();
  const fields = {
    participantId,
    firstName: req.body.firstName.trim(),
    lastName: req.body.lastName.trim(),
    age: req.body.age,
    email: req.body.email.trim().toLowerCase(),
    consent: req.body.consent,
    registeredAt: new Date().toISOString(),
  };
  const endpoint = `/v0/${baseId}/${encodeURIComponent(tableName)}`;
  const requestBody = JSON.stringify({ records: [{ fields }], typecast: true });

  try {
    let response: Response;
    const token = process.env["AIRTABLE_TOKEN"];
    if (token) {
      response = await fetch(`https://api.airtable.com${endpoint}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: requestBody,
      });
    } else {
      const connectors = new ReplitConnectors();
      response = await connectors.proxy("airtable", endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: requestBody,
      });
    }

    if (!response.ok) {
      const details = await response.text();
      console.error("Airtable registration failed", response.status, details);
      res.status(502).json({ message: "Не удалось сохранить регистрацию в Airtable." });
      return;
    }

    res.status(201).json({ participantId });
  } catch (error) {
    console.error("Registration request failed", error);
    res.status(502).json({ message: "Не удалось сохранить регистрацию в Airtable." });
  }
});

export default router;