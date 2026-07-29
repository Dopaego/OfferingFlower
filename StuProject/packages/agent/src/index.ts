export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type CompletionRequest = {
  messages: readonly ChatMessage[];
  temperature?: number;
  maxTokens?: number;
};

export type CompletionResponse = {
  content: string;
  model: string;
  durationMs: number;
  usage?: TokenUsage;
};

export interface LlmProvider {
  readonly name: string;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}

export class ProviderError extends Error {
  public readonly retryable: boolean;

  public constructor(message: string, retryable: boolean, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "ProviderError";
    this.retryable = retryable;
  }
}

export class FakeProvider implements LlmProvider {
  public readonly name = "fake";

  public async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const lastMessage = request.messages.at(-1);
    const topic = lastMessage?.content.slice(0, 120) ?? "未提供问题描述";
    return {
      model: "fake-planner-v1",
      durationMs: 0,
      content: JSON.stringify({
        summary: `针对问题的诊断计划：${topic}`,
        hypothesis: "需要先收集可复现路径、浏览器日志和最近的相关代码改动。",
        investigationSteps: ["确认复现步骤", "检查浏览器控制台与网络请求", "定位相关组件和状态变更"],
        risks: ["当前仅为规划输出，尚未执行代码修改或外部工具调用"],
        requiresHumanApproval: true,
      }),
    };
  }
}

type OpenAiChoice = {
  message?: { content?: string | null };
};

type OpenAiUsage = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

type OpenAiResponse = {
  model?: string;
  choices?: OpenAiChoice[];
  usage?: OpenAiUsage;
};

export type OpenAiCompatibleProviderOptions = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  fetchImplementation?: typeof fetch;
};

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.replace(/\/+$/, "");
}

function toTokenUsage(usage: OpenAiUsage | undefined): TokenUsage | undefined {
  if (usage === undefined) {
    return undefined;
  }
  return {
    ...(usage.prompt_tokens === undefined ? {} : { inputTokens: usage.prompt_tokens }),
    ...(usage.completion_tokens === undefined ? {} : { outputTokens: usage.completion_tokens }),
    ...(usage.total_tokens === undefined ? {} : { totalTokens: usage.total_tokens }),
  };
}

export class OpenAiCompatibleProvider implements LlmProvider {
  public readonly name = "openai-compatible";
  private readonly timeoutMs: number;
  private readonly fetchImplementation: typeof fetch;

  public constructor(private readonly options: OpenAiCompatibleProviderOptions) {
    if (options.apiKey.trim() === "") {
      throw new Error("LLM_API_KEY 不能为空；本地开发请使用 FakeProvider");
    }
    if (options.model.trim() === "") {
      throw new Error("LLM_MODEL 不能为空");
    }
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.fetchImplementation = options.fetchImplementation ?? fetch;
  }

  public async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startedAt = Date.now();
    let response: Response;
    try {
      response = await this.fetchImplementation(`${normalizeBaseUrl(this.options.baseUrl)}/chat/completions`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.options.apiKey}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.options.model,
          messages: request.messages,
          ...(request.temperature === undefined ? {} : { temperature: request.temperature }),
          ...(request.maxTokens === undefined ? {} : { max_tokens: request.maxTokens }),
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch (error: unknown) {
      const timedOut = error instanceof DOMException && error.name === "TimeoutError";
      throw new ProviderError(timedOut ? "LLM 请求超时" : "LLM 网络请求失败", true, { cause: error });
    }

    if (!response.ok) {
      const retryable = response.status === 429 || response.status >= 500;
      throw new ProviderError(`LLM 请求失败，HTTP ${response.status}`, retryable);
    }

    let body: OpenAiResponse;
    try {
      body = (await response.json()) as OpenAiResponse;
    } catch (error: unknown) {
      throw new ProviderError("LLM 返回了无法解析的 JSON", false, { cause: error });
    }
    const content = body.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
      throw new ProviderError("LLM 响应缺少 choices[0].message.content", false);
    }
    const usage = toTokenUsage(body.usage);

    return {
      content,
      model: body.model ?? this.options.model,
      durationMs: Date.now() - startedAt,
      ...(usage === undefined ? {} : { usage }),
    };
  }
}

/** 没有配置 Key 时，开发与测试默认使用确定性 FakeProvider。 */
export function createDefaultProvider(environment: NodeJS.ProcessEnv = process.env): LlmProvider {
  const apiKey = environment["LLM_API_KEY"];
  if (apiKey === undefined || apiKey.trim() === "") {
    return new FakeProvider();
  }
  return new OpenAiCompatibleProvider({
    apiKey,
    baseUrl: environment["LLM_BASE_URL"] ?? "https://api.openai.com/v1",
    model: environment["LLM_MODEL"] ?? "gpt-4o-mini",
  });
}

export * from "./orchestrator.js";
export * from "./planner.js";
export * from "./tools.js";
