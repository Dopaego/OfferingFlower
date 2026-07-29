import { readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";

export const TOOL_NAMES = ["read_file", "search_code", "apply_patch"] as const;
export type ToolName = (typeof TOOL_NAMES)[number];
export type ToolRisk = "read" | "controlled-write";

export type ToolRequest = {
  name: ToolName;
  input: unknown;
};

export type ToolAuthorization =
  | { allowed: true; reason: "allowed" }
  | {
      allowed: false;
      reason: "unknown_tool" | "invalid_input" | "path_outside_workspace" | "approval_required" | "budget_exhausted";
    };

export type ToolDefinition<Input, Output> = {
  name: ToolName;
  risk: ToolRisk;
  validateInput: (input: unknown) => Input;
  execute: (input: Input) => Promise<Output>;
};

export class ToolInputError extends Error {
  public readonly reason: Extract<ToolAuthorization, { allowed: false }> ["reason"];

  public constructor(message: string, reason: Extract<ToolAuthorization, { allowed: false }> ["reason"] = "invalid_input") {
    super(message);
    this.name = "ToolInputError";
    this.reason = reason;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** 教学级日志脱敏；真实生产还需要专门的 secret 扫描和访问控制。 */
export function redactSensitiveText(text: string): string {
  return text
    .replace(/(api[_-]?key|token|password|secret)\s*[:=]\s*[^\s"']+/gi, "$1=[REDACTED]")
    .replace(/Bearer\s+[^\s"']+/gi, "Bearer [REDACTED]")
    .replace(/postgres(?:ql)?:\/\/[^\s"']+/gi, "[REDACTED_DATABASE_URL]");
}

function validateRelativePath(input: unknown): string {
  if (!isRecord(input) || typeof input["path"] !== "string" || input["path"].trim() === "") {
    throw new ToolInputError("read_file 需要非空 path", "invalid_input");
  }
  const path = input["path"].trim();
  if (isAbsolute(path)) {
    throw new ToolInputError("不允许绝对路径", "path_outside_workspace");
  }
  return path;
}

export function createReadFileTool(workspaceRoot: string): ToolDefinition<{ path: string }, { path: string; content: string }> {
  const resolvedRoot = resolve(workspaceRoot);
  return {
    name: "read_file",
    risk: "read",
    validateInput(input): { path: string } {
      const path = validateRelativePath(input);
      const resolvedPath = resolve(resolvedRoot, path);
      const relativePath = relative(resolvedRoot, resolvedPath);
      if (relativePath === "" || relativePath.startsWith("..") || isAbsolute(relativePath)) {
        throw new ToolInputError("路径不在允许的工作区内", "path_outside_workspace");
      }
      return { path: relativePath };
    },
    async execute(input): Promise<{ path: string; content: string }> {
      const resolvedPath = resolve(resolvedRoot, input.path);
      const fileStat = await stat(resolvedPath);
      if (!fileStat.isFile()) {
        throw new ToolInputError("只允许读取普通文件", "invalid_input");
      }
      const content = await readFile(resolvedPath, "utf8");
      return { path: input.path, content: redactSensitiveText(content) };
    },
  };
}

export class ToolPolicy {
  private readonly tools: ReadonlyMap<ToolName, ToolDefinition<unknown, unknown>>;

  public constructor(tools: readonly ToolDefinition<unknown, unknown>[], private readonly maxReadCalls = 5) {
    this.tools = new Map(tools.map((tool) => [tool.name, tool]));
  }

  public authorize(input: {
    request: { name: string; input: unknown };
    hasApproval: boolean;
    readCallsUsed: number;
  }): ToolAuthorization {
    const tool = this.tools.get(input.request.name as ToolName);
    if (tool === undefined) {
      return { allowed: false, reason: "unknown_tool" };
    }
    if (tool.risk === "controlled-write" && !input.hasApproval) {
      return { allowed: false, reason: "approval_required" };
    }
    if (tool.risk === "read" && input.readCallsUsed >= this.maxReadCalls) {
      return { allowed: false, reason: "budget_exhausted" };
    }
    try {
      tool.validateInput(input.request.input);
    } catch (error: unknown) {
      if (error instanceof ToolInputError) {
        return { allowed: false, reason: error.reason };
      }
      return { allowed: false, reason: "invalid_input" };
    }
    return { allowed: true, reason: "allowed" };
  }

  public async execute(request: ToolRequest): Promise<unknown> {
    const tool = this.tools.get(request.name);
    if (tool === undefined) {
      throw new ToolInputError(`未知工具: ${request.name}`, "unknown_tool");
    }
    const validatedInput = tool.validateInput(request.input);
    return tool.execute(validatedInput);
  }
}
