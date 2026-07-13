type AgentStatus = "planned" | "running" | "succeeded" | "failed";

type TaskState = {
  taskId: string;
  userRequest: string;
  files: string[];
  evidence: string[];
  results: string[];
  status: AgentStatus;
  attempts: number;
};

type ToolContext = {
  state: TaskState;
  log: (event: string, data?: Record<string, unknown>) => void;
};

type Tool<Input> = {
  name: string;
  description: string;
  execute: (input: Input, context: ToolContext) => Promise<string>;
};

type Plan = {
  searchTerms: string[];
  checks: string[];
};

type Blackboard = Map<string, unknown>;

const blackboard: Blackboard = new Map();

const tools: Record<string, Tool<{ term: string }>> = {
  searchCode: {
    name: "searchCode",
    description: "Search the repository using a concrete UI or symbol identifier.",
    async execute({ term }, { state, log }) {
      log("tool.start", { tool: "searchCode", term });
      await delay(20);
      const file = `src/components/${term.replace(/[^a-zA-Z0-9]/g, "")}.tsx`;
      state.files.push(file);
      state.evidence.push(`${term} found in ${file}`);
      return file;
    },
  },
  inspectBrowser: {
    name: "inspectBrowser",
    description: "Inspect a page and return DOM evidence.",
    async execute({ term }, { state, log }) {
      log("tool.start", { tool: "inspectBrowser", term });
      await delay(30);
      const evidence = `DOM evidence: [data-testid="${term}"] is visible`;
      state.evidence.push(evidence);
      return evidence;
    },
  },
};

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function createState(userRequest: string): TaskState {
  return {
    taskId: crypto.randomUUID(),
    userRequest,
    files: [],
    evidence: [],
    results: [],
    status: "planned",
    attempts: 0,
  };
}

// In a real application this function is backed by an LLM structured output call.
function createPlan(userRequest: string): Plan {
  const stopWords = new Set(["fix", "the", "a", "an", "and", "or", "in", "on"]);
  const terms = (userRequest.match(/[a-zA-Z][a-zA-Z0-9_-]*/g) ?? []).filter(
    (term) => !stopWords.has(term.toLowerCase()),
  );
  const searchTerms = terms.length > 0 ? terms.slice(0, 2) : ["IssuePanel"];
  return {
    searchTerms,
    checks: ["inspectBrowser"],
  };
}

function createContext(state: TaskState): ToolContext {
  return {
    state,
    log(event, data) {
      console.log(JSON.stringify({ event, taskId: state.taskId, ...data }));
    },
  };
}

async function runParallel<T>(jobs: Array<() => Promise<T>>): Promise<T[]> {
  return Promise.all(jobs.map((job) => job()));
}

function compressSession(state: TaskState): string {
  return JSON.stringify({
    taskId: state.taskId,
    latestIntent: state.userRequest,
    stillApplicable: state.evidence.slice(-3),
    files: state.files,
    status: state.status,
  });
}

async function runAgent(userRequest: string): Promise<TaskState> {
  const state = createState(userRequest);
  const context = createContext(state);
  const plan = createPlan(userRequest);

  blackboard.set(`${state.taskId}:plan`, plan);
  blackboard.set(`${state.taskId}:state`, state);
  state.status = "running";
  state.attempts += 1;
  context.log("plan.created", { plan });

  try {
    const searchJobs = plan.searchTerms.map((term) => () =>
      tools.searchCode.execute({ term }, context),
    );
    const searchResults = await runParallel(searchJobs);
    state.results.push(...searchResults);

    const browserResult = await tools.inspectBrowser.execute(
      { term: plan.searchTerms[0] },
      context,
    );
    state.results.push(browserResult);
    state.status = "succeeded";
  } catch (error) {
    state.status = "failed";
    state.results.push(error instanceof Error ? error.message : "Unknown error");
  }

  blackboard.set(`${state.taskId}:state`, state);
  blackboard.set(`${state.taskId}:sessionSummary`, compressSession(state));
  context.log("task.finished", { status: state.status });
  return state;
}

async function main(): Promise<void> {
  const result = await runAgent("Fix the IssuePanel empty state");
  console.log("Final state:", result);
  console.log("Compressed session:", blackboard.get(`${result.taskId}:sessionSummary`));
}

main().catch((error: unknown) => {
  console.error("Agent failed:", error);
  process.exitCode = 1;
});
