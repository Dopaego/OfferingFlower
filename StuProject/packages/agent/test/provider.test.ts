import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createDefaultProvider,
  FakeProvider,
  OpenAiCompatibleProvider,
  ProviderError,
} from "../src/index.ts";

test("FakeProvider 生成可重复的 JSON 规划输出", async () => {
  const provider = new FakeProvider();
  const response = await provider.complete({
    messages: [{ role: "user", content: "订单列表白屏" }],
  });

  const plan = JSON.parse(response.content) as { requiresHumanApproval: boolean; investigationSteps: string[] };
  assert.equal(response.model, "fake-planner-v1");
  assert.equal(plan.requiresHumanApproval, true);
  assert.equal(plan.investigationSteps.length, 3);
});

test("默认 Provider 在未配置 LLM_API_KEY 时选择 FakeProvider", () => {
  const provider = createDefaultProvider({});
  assert.ok(provider instanceof FakeProvider);
});

test("OpenAI 兼容 Provider 发送标准请求并映射 token 用量", async () => {
  let receivedAuthorization: string | null = null;
  const provider = new OpenAiCompatibleProvider({
    baseUrl: "https://llm.example/v1/",
    apiKey: "test-key",
    model: "test-model",
    fetchImplementation: async (_input, init) => {
      receivedAuthorization = new Headers(init?.headers).get("authorization");
      return new Response(
        JSON.stringify({
          model: "server-model",
          choices: [{ message: { content: "{\"summary\":\"ok\"}" } }],
          usage: { prompt_tokens: 3, completion_tokens: 5, total_tokens: 8 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });

  const response = await provider.complete({ messages: [{ role: "user", content: "hello" }], maxTokens: 128 });
  assert.equal(receivedAuthorization, "Bearer test-key");
  assert.equal(response.model, "server-model");
  assert.deepEqual(response.usage, { inputTokens: 3, outputTokens: 5, totalTokens: 8 });
});

test("OpenAI 兼容 Provider 会把限流标记为可重试且不泄露 Key", async () => {
  const provider = new OpenAiCompatibleProvider({
    baseUrl: "https://llm.example/v1",
    apiKey: "secret-key-must-not-leak",
    model: "test-model",
    fetchImplementation: async () => new Response("rate limited", { status: 429 }),
  });

  await assert.rejects(
    provider.complete({ messages: [{ role: "user", content: "hello" }] }),
    (error: unknown) => error instanceof ProviderError && error.retryable && !error.message.includes("secret-key-must-not-leak"),
  );
});
