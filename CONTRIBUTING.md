# Contributing to AgentTrace

Thank you for your interest in contributing. AgentTrace is an open standard — its value comes from the community adopting and improving it together.

---

## What we need most right now

### 1. Feedback on the spec
If you're building agents and something in the spec doesn't fit your use case, open an issue. Describe what you're building and what the spec makes hard or impossible. This is the most valuable contribution you can make at this stage.

Good issue titles:
- "Spec doesn't handle streaming responses well — here's my use case"
- "Need a way to record agent memory reads/writes"
- "The `handoff` step doesn't cover async sub-agent calls"

### 2. Integration guides
Show developers how to emit `.atrace` files from existing frameworks. A good integration guide is a single Markdown file in `spec/v0.1/integrations/` that includes:
- A working code example (copy-paste ready)
- The minimum lines of code to instrument an existing agent
- One example `.atrace` output from a real run

Priority frameworks: LangChain, CrewAI, AutoGen, LlamaIndex, plain Anthropic SDK.

### 3. Example traces
Real traces from real agents. If you've instrumented an agent and produced a `.atrace` file, submit it as an example (scrub any sensitive data first). Real examples are more valuable than constructed ones.

### 4. Validator implementations
We have Python and TypeScript validators planned. If you want to implement a validator in Go, Rust, Ruby, or another language, open an issue first to coordinate.

---

## How to contribute

1. Fork the repo
2. Create a branch: `git checkout -b your-contribution`
3. Make your changes
4. Open a pull request with a clear description

For spec changes (anything in `spec/`), open an issue first to discuss before writing the PR. Spec changes need more review than code changes.

---

## Spec change process

The spec follows semver. Here's what requires what level of review:

| Change type | Version bump | Process |
|---|---|---|
| Typo fix, clarification | Patch (0.1.x) | PR directly |
| New optional field | Minor (0.x.0) | Issue first, then PR |
| Rename, remove, or breaking change | Major (x.0.0) | RFC issue, discussion period, then PR |

A breaking change to the spec is a last resort. We will not remove or rename fields without a deprecation period of at least one minor version.

---

## Code of conduct

Be direct. Be kind. Assume good intent. Disagreements about spec design are expected and healthy — keep them focused on the technical merits.

---

## Questions?

Open an issue with the `question` label. There are no dumb questions about a new spec.
