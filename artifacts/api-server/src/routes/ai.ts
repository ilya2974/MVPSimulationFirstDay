import { Router, type IRouter } from "express";
const router: IRouter = Router();
type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const DEFAULT_MODEL = "google/gemma-4-31b-it:free";
const DEFAULT_FALLBACK_MODEL = "liquid/lfm-2.5-2.6b:free";
const RETRYABLE_STATUSES = new Set([408, 429, 500, 502, 503, 504]);

function openRouterHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "http://localhost:3000",
    "X-Title": process.env.OPENROUTER_APP_NAME || "MVP Simulation",
  };
}

router.post("/ai/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 4000) { res.status(400).json({ message: "Сообщение должно содержать от 1 до 4000 символов." }); return; }
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { res.status(503).json({ message: "AI-помощник пока не настроен на сервере." }); return; }
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const messages: ChatMessage[] = [{ role: "system", content: "Ты корпоративный ИИ-помощник. Отвечай кратко и структурированно по рабочим задачам первого дня." }, ...history.filter((item: unknown): item is ChatMessage => Boolean(item && typeof item === "object" && ["user", "assistant"].includes((item as ChatMessage).role) && typeof (item as ChatMessage).content === "string")).slice(-10), { role: "user", content: message }];
  const models = [...new Set([
    process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
    process.env.OPENROUTER_FALLBACK_MODEL || DEFAULT_FALLBACK_MODEL,
  ])];
  let lastStatus: number | null = null;
  let networkError = false;

  try {
    for (const model of models) {
      try {
        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: openRouterHeaders(apiKey),
          body: JSON.stringify({ model, messages, temperature: 0.4 }),
          signal: AbortSignal.timeout(30_000),
        });
        const data = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: unknown } }> };
        const answer = data?.choices?.[0]?.message?.content;
        if (response.ok && typeof answer === "string" && answer.trim()) {
          res.json({ message: answer.trim() });
          return;
        }
        lastStatus = response.status;
        if (!RETRYABLE_STATUSES.has(response.status)) break;
      } catch {
        networkError = true;
      }
    }

    if (lastStatus === 429) {
      res.status(503).json({ code: "ai_rate_limited", message: "AI-модель временно перегружена. Попробуйте ещё раз через несколько секунд." });
      return;
    }
    if (networkError && lastStatus === null) {
      res.status(504).json({ message: "AI-помощник недоступен по сети. Проверьте подключение и попробуйте ещё раз." });
      return;
    }
    res.status(502).json({ message: "Не удалось получить ответ AI-помощника. Попробуйте ещё раз." });
  } catch {
    res.status(504).json({ message: "AI-помощник не ответил вовремя." });
  }
});
export default router;
