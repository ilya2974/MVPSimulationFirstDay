import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const root = fileURLToPath(new URL("../", import.meta.url));

test("production bundle serves SPA, assets and API on one port", { timeout: 20000 }, async () => {
  const probe = createServer();
  probe.listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const child = spawn(process.execPath, ["artifacts/api-server/dist/index.mjs"], {
    cwd: root,
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused",
      OPENROUTER_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  child.stdout.on("data", (data) => { output += data; });
  child.stderr.on("data", (data) => { output += data; });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      assert.equal(child.exitCode, null, output);
      try { ready = (await fetch(`${base}/api/healthz`)).ok; } catch {}
      if (ready) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, output);
    let index;
    for (const route of ["/", "/register", "/instruction", "/workspace", "/finish", "/nested/route"]) {
      const response = await fetch(base + route, { headers: { Accept: "text/html" } });
      assert.equal(response.status, 200, route);
      assert.match(response.headers.get("content-type"), /text\/html/);
      const html = await response.text();
      index ??= html;
      assert.equal(html, index);
      assert.equal(response.headers.get("cache-control"), "no-cache");
    }
    const asset = index.match(/src="([^"]+\.js)"/)[1];
    const js = await fetch(base + asset);
    assert.equal(js.status, 200);
    assert.match(js.headers.get("content-type"), /javascript/);
    assert.equal((await fetch(`${base}/favicon.svg`)).status, 200);
    assert.deepEqual(await (await fetch(`${base}/api/healthz`)).json(), { status: "ok" });
    for (const route of ["/api", "/api/missing", "/api/missing/nested"]) {
      const response = await fetch(base + route, { headers: { Accept: "text/html" } });
      assert.equal(response.status, 404);
      assert.match(response.headers.get("content-type"), /json/);
    }
    assert.equal((await fetch(`${base}/assets/missing.js`)).status, 404);
    assert.equal((await fetch(`${base}/workspace`, { method: "POST" })).status, 404);
    const registration = await fetch(`${base}/api/register`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: "{}",
    });
    assert.equal(registration.status, 400);
  } finally {
    if (child.exitCode === null) {
      const exited = once(child, "exit");
      child.kill("SIGTERM");
      await exited;
    }
  }
});
