import { Router, type IRouter } from "express";
const router: IRouter = Router();
type ChatMessage = { role: "user" | "assistant"; content: string };
router.post("/ai/chat", async (req, res) => {
  const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 4000) { res.status(400).json({ message: "Сообщение должно содержать от 1 до 4000 символов." }); return; }
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) { res.status(503).json({ message: "AI-помощник пока не настроен на сервере." }); return; }
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const messages: ChatMessage[] = [{ role: "user", content: "Ты корпоративный ИИ-помощник. Отвечай кратко и структурированно по рабочим задачам первого дня." }, ...history.filter((item: unknown): item is ChatMessage => Boolean(item && typeof item === "object" && ["user", "assistant"].includes((item as ChatMessage).role) && typeof (item as ChatMessage).content === "string")).slice(-10), { role: "user", content: message }];
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: process.env.OPENAI_MODEL || "gpt-4o-mini", messages, temperature: 0.4 }), signal: AbortSignal.timeout(30_000) });
    const data = await response.json().catch(() => ({})) as { choices?: Array<{ message?: { content?: unknown } }> };
    const answer = data?.choices?.[0]?.message?.content;
    if (!response.ok || typeof answer !== "string" || !answer.trim()) { res.status(502).json({ message: "Не удалось получить ответ AI-помощника." }); return; }
    res.json({ message: answer.trim() });
  } catch { res.status(504).json({ message: "AI-помощник не ответил вовремя." }); }
});
export default router;
