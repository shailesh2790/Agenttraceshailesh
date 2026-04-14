import { readFileSync } from "fs";
import { join } from "path";
import { validate } from "../src/validator";

const EXAMPLES_V02 = join(__dirname, "../../../spec/v0.2/examples");

function load(filename: string): unknown {
  return JSON.parse(readFileSync(join(EXAMPLES_V02, filename), "utf-8"));
}

// ---------------------------------------------------------------------------
// v0.2 examples — must all pass
// ---------------------------------------------------------------------------

describe("v0.2 examples", () => {
  test.each([
    "memory-agent.atrace",
    "react-loop.atrace",
    "retry-with-backoff.atrace",
    "custom-steps.atrace",
  ])("%s is valid", (filename) => {
    const trace = load(filename);
    expect(validate(trace)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Invalid traces
// ---------------------------------------------------------------------------

describe("invalid traces", () => {
  test("missing required field agent", () => {
    const trace = {
      atrace: "0.2.0",
      id: "trace_001",
      goal: "Do something",
      status: "completed",
      started_at: "2026-04-14T10:00:00Z",
      steps: [],
    };
    expect(validate(trace)).not.toBeNull();
  });

  test("invalid status value", () => {
    const trace = {
      atrace: "0.2.0",
      id: "trace_001",
      agent: { name: "test" },
      goal: "Do something",
      status: "in_progress",
      started_at: "2026-04-14T10:00:00Z",
      steps: [],
    };
    expect(validate(trace)).not.toBeNull();
  });

  test("invalid step type", () => {
    const trace = {
      atrace: "0.2.0",
      id: "trace_001",
      agent: { name: "test" },
      goal: "Do something",
      status: "completed",
      started_at: "2026-04-14T10:00:00Z",
      steps: [{ id: "step_1", type: "unknown", started_at: "2026-04-14T10:00:01Z" }],
    };
    expect(validate(trace)).not.toBeNull();
  });

  test("empty goal fails", () => {
    const trace = {
      atrace: "0.2.0",
      id: "trace_001",
      agent: { name: "test" },
      goal: "",
      status: "completed",
      started_at: "2026-04-14T10:00:00Z",
      steps: [],
    };
    expect(validate(trace)).not.toBeNull();
  });

  test("tool_call missing input fails", () => {
    const trace = {
      atrace: "0.2.0",
      id: "trace_001",
      agent: { name: "test" },
      goal: "Do something",
      status: "completed",
      started_at: "2026-04-14T10:00:00Z",
      steps: [{ id: "step_1", type: "tool_call", started_at: "2026-04-14T10:00:01Z", tool: "search" }],
    };
    expect(validate(trace)).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Valid traces
// ---------------------------------------------------------------------------

describe("valid traces", () => {
  test("minimal trace is valid", () => {
    const trace = {
      atrace: "0.2.0",
      id: "trace_min",
      agent: { name: "test" },
      goal: "Do something",
      status: "completed",
      started_at: "2026-04-14T10:00:00Z",
      steps: [],
    };
    expect(validate(trace)).toBeNull();
  });

  test("tokens field is optional and valid", () => {
    const trace = {
      atrace: "0.2.0",
      id: "trace_min",
      agent: { name: "test" },
      goal: "Do something",
      status: "completed",
      started_at: "2026-04-14T10:00:00Z",
      steps: [],
      tokens: { total: 1000 },
    };
    expect(validate(trace)).toBeNull();
  });

  test("memory step is valid", () => {
    const trace = {
      atrace: "0.2.0",
      id: "trace_mem",
      agent: { name: "test" },
      goal: "Remember",
      status: "completed",
      started_at: "2026-04-14T10:00:00Z",
      steps: [
        {
          id: "step_1",
          type: "memory",
          started_at: "2026-04-14T10:00:01Z",
          operation: "write",
          key: "foo",
          value: "bar",
        },
      ],
    };
    expect(validate(trace)).toBeNull();
  });

  test("custom step is valid", () => {
    const trace = {
      atrace: "0.2.0",
      id: "trace_custom",
      agent: { name: "test" },
      goal: "Custom",
      status: "completed",
      started_at: "2026-04-14T10:00:00Z",
      steps: [
        {
          id: "step_1",
          type: "custom",
          started_at: "2026-04-14T10:00:01Z",
          custom_type: "guardrail_check",
          data: { passed: true },
        },
      ],
    };
    expect(validate(trace)).toBeNull();
  });
});
