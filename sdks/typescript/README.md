# agentrace (TypeScript / Node.js)

TypeScript SDK for the [AgentTrace](https://github.com/shailesh2790/Agenttraceshailesh) open standard — validate and emit `.atrace` files that record what your AI agents do and why.

```bash
npm install agentrace
```

---

## Quickstart

```ts
import { Emitter } from "agentrace";

const emitter = new Emitter({
  agent: "research-agent",
  goal: "Find top competitors for a storytelling app",
  model: "claude-sonnet-4-6",
  input: "What are the top 3 competitors for StorySpark?",
});

emitter.think("I should search for storytelling and public speaking apps");

emitter.toolCall(
  "web_search",
  { query: "storytelling app public speaking coach 2026" },
  { output: { results: ["Orai", "Speeko", "Yoodli"] }, durationMs: 1240 }
);

emitter.respond("The top 3 competitors are Orai, Speeko, and Yoodli.", {
  format: "markdown",
  final: true,
});

const trace = emitter.finish();
console.log(JSON.stringify(trace, null, 2));
```

---

## API

### `new Emitter(opts)`

```ts
const emitter = new Emitter({
  agent: "agent-name",          // required
  goal: "Plain English goal",   // required
  model: "claude-sonnet-4-6",   // optional
  agentVersion: "1.0.0",        // optional
  input: "raw user prompt",     // optional
  parentTraceId: "trace_xyz",   // optional — for sub-agents
  traceId: "trace_custom_id",   // optional — auto-generated if omitted
  meta: { env: "production" },  // optional
});
```

#### Step methods

| Method | Step type | Key options |
|---|---|---|
| `emitter.think(reasoning)` | `think` | — |
| `emitter.toolCall(tool, input, opts?)` | `tool_call` | `output`, `durationMs`, `error`, `retryOf` |
| `emitter.respond(content, opts?)` | `respond` | `format`, `final` |
| `emitter.handoff(toAgent, task, opts?)` | `handoff` | `childTraceId` |
| `emitter.error(message, opts?)` | `error` | `code`, `recoverable` |
| `emitter.memory(operation, opts?)` | `memory` | `store`, `key`, `value`, `query`, `results` |
| `emitter.loop(iterations, opts?)` | `loop` | `label`, `maxIterations`, `exitReason` |
| `emitter.custom(customType, opts?)` | `custom` | `data` |

All step methods accept `meta` and `stepId` in their options.

#### Auto-timed tool calls

```ts
await emitter.timeToolCall("web_fetch", { url }, async (call) => {
  const result = await fetch(url);
  call.output = await result.json();
});
// duration_ms recorded automatically
```

#### Finishing a trace

```ts
const trace = emitter.finish();                            // status: "completed"
const trace = emitter.finish("cancelled");
const trace = emitter.fail();                              // status: "failed"
const trace = emitter.finish("completed", {
  tokens: { input: 420, output: 1422, total: 1842 }
});
```

---

### `validate(trace: unknown): ValidationError[] | null`

```ts
import { validate } from "agentrace";
import { readFileSync } from "fs";

const trace = JSON.parse(readFileSync("run.atrace", "utf-8"));
const errors = validate(trace);

if (errors === null) {
  console.log("valid");
} else {
  errors.forEach((e) => console.error(e.path, e.message));
}
```

---

## Requirements

- Node.js 18+
- TypeScript 5+ (for type definitions)
