import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { participants, simulationState } from "@workspace/db/schema";
import {
  asksForReadySolution,
  isUsableAgentAnswer,
  knowledgeContext,
  knowledgeFallbackResponse,
  navigatorResponse,
  requestsKnowledge,
  resolveAgentMode,
  retrievedMaterials,
  simulationAgentSystemPrompt,
  toPlainText,
  updateUsageMetrics,
  type AiUsageMetrics,
} from "../lib/ai-agent";

const router: IRouter = Router();
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };
type OpenRouterResponse = { choices?: Array<{ message?: { content?: unknown } }> };

async function requestCompletion(apiKey: string, model: string, messages: ChatMessage[]) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_SITE_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:3000",
      "X-Title": process.env.OPENROUTER_APP_NAME || "MVP Simulation",
    },
    body: JSON.stringify({ model, messages, temperature: 0.25 }),
    signal: AbortSignal.timeout(30_000),
  });
  const data = (await response.json().catch(() => ({}))) as OpenRouterResponse;
  return { response, data };
}

function isParticipantId(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

async function persistUsageMetrics(participantId: string | undefined, message: string, history: ChatMessage[], mode: "navigator" | "knowledge") {
  if (!participantId) return;
  try {
    const [participant] = await db.select({ id: participants.id }).from(participants).where(eq(participants.id, participantId));
    if (!participant) return;
    const [state] = await db.select().from(simulationState).where(eq(simulationState.participantId, participantId));
    const previous = state?.data.ai_usage_metrics as Partial<AiUsageMetrics> | undefined;
    const metrics = updateUsageMetrics(previous, message, history, mode);
    const now = new Date();
    await db.insert(simulationState).values({ participantId, data: { ai_usage_metrics: metrics }, updatedAt: now }).onConflictDoUpdate({
      target: simulationState.participantId,
      set: { data: sql`${simulationState.data} || ${JSON.stringify({ ai_usage_metrics: metrics })}::jsonb`, updatedAt: now },
    });
  } catch {
    // Metrics must never interrupt the participant's AI conversation.
  }
}

router.post("/ai/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 4000) {
    res.status(400).json({ message: "Сообщение должно содержать от 1 до 4000 символов." });
    return;
  }

  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const safeHistory = history.filter(
    (item: unknown): item is Omit<ChatMessage, "system"> =>
      Boolean(item && typeof item === "object" && ["user", "assistant"].includes((item as ChatMessage).role) && typeof (item as ChatMessage).content === "string"),
  ).slice(-10);
  const participantId = isParticipantId(req.body?.participantId) ? req.body.participantId : undefined;
  const mode = resolveAgentMode(message);
  void persistUsageMetrics(participantId, message, safeHistory, mode);

  if (asksForReadySolution(message)) {
    res.json({ message: navigatorResponse() });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.json({ message: navigatorResponse() });
    return;
  }

  const documents = requestsKnowledge(message) ? retrievedMaterials(message) : [];
  const currentTask = Number.isInteger(req.body?.simulationTask) ? req.body.simulationTask : undefined;
  const taskContext = currentTask ? `Участник сейчас находится на задании ${currentTask}.` : "";
  const retrievalContext = documents.length > 0
    ? `Участник явно запросил конкретный материал. Используй только следующие найденные материалы, передай относящиеся к запросу факты кратко и направь участника к самостоятельному выводу.\n\n${knowledgeContext(documents)}`
    : mode === "knowledge"
      ? "Участник явно запросил материал, но точного совпадения среди доступных материалов нет. Сообщи, что именно стоит уточнить в названии письма, задания или документе, не придумывая факты."
      : "Материалы симуляции не запрашивались. Не используй и не раскрывай их содержание.";
  const messages: ChatMessage[] = [
    { role: "system", content: `${simulationAgentSystemPrompt}\n${taskContext}\n${retrievalContext}` },
    ...safeHistory,
    { role: "user", content: message },
  ];

  try {
    const primaryModel = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free";
    const fallbackModel = process.env.OPENROUTER_FALLBACK_MODEL || "openrouter/free";
    let result = await requestCompletion(apiKey, primaryModel, messages);
    if (result.response.status === 429 && primaryModel !== fallbackModel) result = await requestCompletion(apiKey, fallbackModel, messages);

    const answer = result.data?.choices?.[0]?.message?.content;
    if (!result.response.ok || typeof answer !== "string" || !answer.trim()) {
      res.json({ message: mode === "knowledge" ? knowledgeFallbackResponse(documents) : navigatorResponse() });
      return;
    }
    res.json({ message: isUsableAgentAnswer(answer) ? toPlainText(answer) : knowledgeFallbackResponse(documents) });
  } catch {
    res.json({ message: mode === "knowledge" ? knowledgeFallbackResponse(documents) : navigatorResponse() });
  }
});

export default router;
