import "dotenv/config";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serve } from "@hono/node-server";
import { Hono } from "hono";

const port = process.env.WEBHOOK_PORT;
if (!port) {
  throw new Error("WEBHOOK_PORT is not set");
}
const webhookSecret = process.env.WEBHOOK_SECRET;

const app = new Hono();

app.get("/ok", (c) => {
  return c.text("OK", 200);
});

app.post("/notify", async (c) => {
  const rawBody = await c.req.text();

  if (webhookSecret) {
    const signature = c.req.header("X-Webhook-Signature");
    if (!signature) {
      return c.json({ error: "Missing signature" }, 401);
    }
    const expected =
      "sha256=" +
      createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
    const sigBuf = Buffer.from(signature, "utf8");
    const expectedBuf = Buffer.from(expected, "utf8");
    if (
      sigBuf.length !== expectedBuf.length ||
      !timingSafeEqual(sigBuf, expectedBuf)
    ) {
      return c.json({ error: "Invalid signature" }, 401);
    }
  }

  const timestamp = new Date().toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const body = JSON.parse(rawBody) as Record<string, unknown>;
  // Support { type, data } (minimal integration flow) or flat payload
  const event =
    (body.type as string) ??
    (body.event as string) ??
    (body.name as string) ??
    "unknown";
  const data = (body.data as Record<string, unknown>) ?? body;

  console.log("\n========================================");
  console.log(`Webhook: ${event}`);
  console.log(`Timestamp: ${timestamp}`);
  console.log("----------------------------------------");

  if (event === "deposit-received") {
    const b = data as Record<string, unknown>;
    console.log("  Chain ID:      ", b.chain);
    console.log("  Token:         ", b.token);
    console.log("  Amount:        ", b.amount);
    console.log("  Account:       ", b.account);
    console.log("  Tx hash:       ", b.transactionHash);
    console.log("  Sender:        ", b.sender);
  } else if (event === "bridge-started") {
    const b = data as Record<string, unknown>;
    const src = b.source as Record<string, unknown> | undefined;
    const dst = b.destination as Record<string, unknown> | undefined;
    const dep = b.deposit as Record<string, unknown> | undefined;
    console.log("  Account:       ", b.account);
    if (src) {
      console.log("  Source:        ", src.chain, src.asset, "amount:", src.amount);
    }
    if (dst) {
      console.log("  Destination:   ", dst.chain, dst.asset, "amount:", dst.amount);
    }
    if (dep) {
      console.log("  Deposit tx:    ", dep.transactionHash);
      console.log("  Deposit sender:", dep.sender);
    }
  } else if (event === "bridge-complete") {
    const b = data as Record<string, unknown>;
    const src = b.source as Record<string, unknown> | undefined;
    const dst = b.destination as Record<string, unknown> | undefined;
    const dep = b.deposit as Record<string, unknown> | undefined;
    console.log("  Account:       ", b.account);
    if (src) {
      console.log("  Source:        ", src.chain, src.asset, "amount:", src.amount);
      console.log("  Source tx:     ", src.transactionHash);
    }
    if (dst) {
      console.log("  Destination:   ", dst.chain, dst.asset, "amount:", dst.amount);
      console.log("  Destination tx:", dst.transactionHash);
    }
    if (dep) {
      console.log("  Deposit tx:    ", dep.transactionHash);
      console.log("  Deposit sender:", dep.sender);
    }
  } else {
    console.log("Payload:");
    console.log(JSON.stringify(body, null, 2));
  }

  console.log("========================================\n");

  return c.json({ timestamp }, 200);
});

console.log(`Webhook server running on http://localhost:${port}`);
console.log(`  - Health check: GET  http://localhost:${port}/ok`);
console.log(`  - Webhook:      POST http://localhost:${port}/notify`);

serve(
  { fetch: app.fetch, port: Number(port), hostname: "0.0.0.0" },
  (info) => {
    console.log(`Listening on http://${info.address}:${info.port}`);
  }
);
