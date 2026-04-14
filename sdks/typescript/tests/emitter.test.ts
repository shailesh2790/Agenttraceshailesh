import { Emitter } from "../src/emitter";
import { validate } from "../src/validator";

describe("Emitter", () => {
  test("produces a valid trace", () => {
    const e = new Emitter({ agent: "test-agent", goal: "Find something", model: "claude-sonnet-4-6" });
    e.think("I should search first");
    e.toolCall("web_search", { query: "AI agents" }, { output: { results: ["a", "b"] }, durationMs: 1200 });
    e.respond("Here are the results", { format: "markdown", final: true });
    const trace = e.finish();
    expect(validate(trace)).toBeNull();
  });

  test("sets trace fields correctly", () => {
    const e = new Emitter({
      agent: "my-agent",
      goal: "Do X",
      model: "claude-sonnet-4-6",
      agentVersion: "1.0.0",
      input: "Please do X",
    });
    const trace = e.finish();

    expect(trace.atrace).toBe("0.2.0");
    expect(trace.agent.name).toBe("my-agent");
    expect(trace.agent.model).toBe("claude-sonnet-4-6");
    expect(trace.agent.version).toBe("1.0.0");
    expect(trace.goal).toBe("Do X");
    expect(trace.input).toBe("Please do X");
    expect(trace.status).toBe("completed");
    expect(trace.started_at).toBeTruthy();
    expect(trace.ended_at).toBeTruthy();
  });

  test("all step types can be added", () => {
    const e = new Emitter({ agent: "test-agent", goal: "All step types" });

    const think = e.think("Thinking...");
    expect(think.type).toBe("think");

    const tool = e.toolCall("search", { q: "x" }, { output: { r: [] }, durationMs: 500 });
    expect(tool.type).toBe("tool_call");
    expect(tool.duration_ms).toBe(500);

    const respond = e.respond("Done", { format: "text", final: true });
    expect(respond.type).toBe("respond");
    expect(respond.final).toBe(true);

    const handoff = e.handoff("sub-agent", "Do part B", { childTraceId: "trace_child" });
    expect(handoff.type).toBe("handoff");

    const err = e.error("Something failed", { code: "FAIL", recoverable: true });
    expect(err.type).toBe("error");

    const mem = e.memory("write", { store: "cache", key: "foo", value: "bar" });
    expect(mem.type).toBe("memory");

    const custom = e.custom("guardrail_check", { data: { passed: true } });
    expect(custom.type).toBe("custom");
    expect(custom.custom_type).toBe("guardrail_check");

    const trace = e.finish();
    expect(trace.steps).toHaveLength(7);
    expect(validate(trace)).toBeNull();
  });

  test("fail() sets status to failed", () => {
    const e = new Emitter({ agent: "test-agent", goal: "Will fail" });
    e.error("Fatal error", { code: "FATAL" });
    const trace = e.fail();
    expect(trace.status).toBe("failed");
  });

  test("tokens are included in trace", () => {
    const e = new Emitter({ agent: "test-agent", goal: "With tokens" });
    e.respond("Done", { final: true });
    const trace = e.finish("completed", { tokens: { input: 100, output: 200, total: 300 } });

    expect(trace.tokens?.input).toBe(100);
    expect(trace.tokens?.output).toBe(200);
    expect(trace.tokens?.total).toBe(300);
    expect(validate(trace)).toBeNull();
  });

  test("retry_of links steps correctly", () => {
    const e = new Emitter({ agent: "test-agent", goal: "Retry test" });
    const first = e.toolCall("api_get", { url: "https://api.example.com" }, { error: "HTTP 503" });
    const retry = e.toolCall("api_get", { url: "https://api.example.com" }, { output: { data: 42 }, retryOf: first.id });

    expect(retry.retry_of).toBe(first.id);
    expect(validate(e.finish())).toBeNull();
  });

  test("timeToolCall auto-records duration", async () => {
    const e = new Emitter({ agent: "test-agent", goal: "Timed call" });

    await e.timeToolCall("slow_tool", { x: 1 }, async (call) => {
      call.output = { result: 42 };
    });

    const trace = e.finish();
    const step = trace.steps[0] as any;
    expect(step.type).toBe("tool_call");
    expect(step.output).toEqual({ result: 42 });
    expect(step.duration_ms).toBeGreaterThanOrEqual(0);
    expect(validate(trace)).toBeNull();
  });

  test("loop step is valid", () => {
    const e = new Emitter({ agent: "test-agent", goal: "Loop test" });

    const s1 = { id: "step_1_1", type: "think" as const, started_at: new Date().toISOString(), reasoning: "iter 1" };
    const s2 = { id: "step_2_1", type: "think" as const, started_at: new Date().toISOString(), reasoning: "iter 2" };

    const loop = e.loop([[s1], [s2]], { label: "research_loop", maxIterations: 5, exitReason: "goal_reached" });

    expect(loop.type).toBe("loop");
    expect(loop.iterations).toHaveLength(2);
    expect(loop.iterations[0].index).toBe(1);
    expect(loop.iterations[1].index).toBe(2);
    expect(validate(e.finish())).toBeNull();
  });

  test("step IDs are unique across 20 steps", () => {
    const e = new Emitter({ agent: "test-agent", goal: "Unique IDs" });
    for (let i = 0; i < 20; i++) {
      e.think("thinking");
    }
    const trace = e.finish();
    const ids = trace.steps.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
