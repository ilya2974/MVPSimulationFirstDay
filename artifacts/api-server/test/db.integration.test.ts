import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, before, describe, test } from "node:test";
import { eq } from "drizzle-orm";

const databaseUrl = process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("TEST_DATABASE_URL (or DATABASE_URL) must be set to run database integration tests.");
}

// Dynamic imports ensure DATABASE_URL is available before the DB module is evaluated.
process.env.DATABASE_URL = databaseUrl;
const { default: app } = await import("../src/app.ts");
const { db, pool } = await import("@workspace/db");
const { participants, simulationEvents, simulationSessions, simulationState } = await import("@workspace/db/schema");

let server: ReturnType<typeof app.listen>;
let baseUrl = "";

before(async () => {
  server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server did not expose a port.");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  server.close();
  await pool.end();
});

describe("PostgreSQL integration", () => {
  test("connects and exposes the application tables", async () => {
    const result = await db.select({ id: participants.id }).from(participants).limit(1);
    assert.ok(Array.isArray(result));
  });

  test("registers a participant and creates its session and state", async () => {
    const response = await fetch(`${baseUrl}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName: "Тест", lastName: "Базы", age: 30, email: `db-test-${Date.now()}@example.com`, consent: true }),
    });
    assert.equal(response.status, 201);
    const { participantId } = await response.json() as { participantId: string };
    assert.match(participantId, /^[0-9a-f-]{36}$/);

    const [participant] = await db.select().from(participants).where(eq(participants.id, participantId));
    const [session] = await db.select().from(simulationSessions).where(eq(simulationSessions.participantId, participantId));
    const [state] = await db.select().from(simulationState).where(eq(simulationState.participantId, participantId));
    assert.equal(participant?.firstName, "Тест");
    assert.equal(session?.status, "not-started");
    assert.deepEqual(state?.data, {});

    await db.delete(simulationEvents).where(eq(simulationEvents.participantId, participantId));
    await db.delete(simulationState).where(eq(simulationState.participantId, participantId));
    await db.delete(simulationSessions).where(eq(simulationSessions.participantId, participantId));
    await db.delete(participants).where(eq(participants.id, participantId));
  });

  test("saves and reads state, and records events through the API", async () => {
    const participantId = randomUUID();
    const now = new Date();
    await db.insert(participants).values({ id: participantId, firstName: "API", lastName: "Тест", age: 25, email: `${participantId}@example.com`, consent: true, registeredAt: now });
    await db.insert(simulationState).values({ participantId, data: {}, updatedAt: now });

    const save = await fetch(`${baseUrl}/api/state/${participantId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: "task1Status", value: "completed" }) });
    assert.equal(save.status, 200);
    const read = await fetch(`${baseUrl}/api/state/${participantId}`);
    assert.deepEqual((await read.json()).data, { task1Status: "completed" });

    const event = await fetch(`${baseUrl}/api/events/${participantId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ eventType: "submitted_task", payload: { task: 1 } }) });
    assert.equal(event.status, 201);
    const events = await db.select().from(simulationEvents).where(eq(simulationEvents.participantId, participantId));
    assert.equal(events.length, 1);

    await db.delete(simulationEvents).where(eq(simulationEvents.participantId, participantId));
    await db.delete(simulationState).where(eq(simulationState.participantId, participantId));
    await db.delete(participants).where(eq(participants.id, participantId));
  });
});
