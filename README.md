# Multi-Agent TypeScript

A local multi-agent coding pipeline written in **TypeScript 7**. Specialized agents research a task, implement it, test it, and review it. They share a typed conversation history and loop until the work passes or a retry limit is reached.

The language model is **[Qwen3 4B](https://ollama.com/library/qwen3)** (`qwen3:4b`), served locally through [Ollama](https://ollama.com). No cloud API key is required for inference.

## How it works

The orchestrator runs a fixed pipeline:

```text
Research → Coding → Testing → Review
                         ↑          |
                         └── Fix ──┘
```

1. **Research** gathers technical context (libraries, APIs, examples) via web search.
2. **Coding** implements the task in a workspace directory.
3. **Testing** inspects the project and runs verification commands (tests, typecheck, lint). It cannot write files.
4. **Review** checks correctness and completeness against the original task. It also cannot write files.

If tests fail or the review finds errors, the coding agent gets a fix prompt and the loop repeats. The default is **3 iterations** (`MAX_PIPELINE_ITERATIONS`).

Research failures do not stop the pipeline. Coding, testing, and review errors are converted into failed reports so the next iteration can still attempt a fix.

## Agents

| Agent          | Role                                      | Tools                                                  |
| -------------- | ----------------------------------------- | ------------------------------------------------------ |
| Research Agent | Produce a structured research report      | `web_search`                                           |
| Coding Agent   | Implement or fix the task in `workspace/` | `read_file`, `list_files`, `write_file`, `run_command` |
| Testing Agent  | Verify the project without changing it    | `read_file`, `list_files`, `run_command`               |
| Reviewer Agent | Review quality and completeness           | `read_file`, `list_files`, `run_command`               |

Each specialist wraps a shared `Agent` class. That class talks to Ollama, executes tool calls, truncates large tool output, and retries when JSON reports fail to parse.

## Tech stack

- **TypeScript 7** (`typescript@^7.0.2`) with strict compiler settings (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`)
- **Node.js** ESM (`"type": "module"`, `module` / `moduleResolution`: `NodeNext`)
- **Ollama** + the official `ollama` client
- **Qwen3 4B** (`qwen3:4b`) as the default chat model
- **SearXNG** for self-hosted search, with DuckDuckGo as fallback
- **tsx** for development, **Prettier** + **Husky** + **lint-staged** for formatting

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- [Ollama](https://ollama.com) installed and running
- [Docker](https://www.docker.com/) (optional, for SearXNG)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Pull the Qwen3 4B model

This project uses **qwen3:4b** by default. Pull it once so Ollama can serve it locally:

```bash
ollama pull qwen3:4b
```

Confirm Ollama is running:

```bash
ollama list
```

You should see `qwen3:4b` in the list.

### 3. Configure environment variables

```bash
cp .env.example .env
```

`.env.example` already points at Qwen3:

```env
OLLAMA_MODEL=qwen3:4b
SEARXNG_URL=http://localhost:8080
MAX_PIPELINE_ITERATIONS=3
```

| Variable                  | Default                 | Description                        |
| ------------------------- | ----------------------- | ---------------------------------- |
| `OLLAMA_MODEL`            | `qwen3:4b`              | Ollama model used by every agent   |
| `SEARXNG_URL`             | `http://localhost:8080` | SearXNG instance used for research |
| `MAX_PIPELINE_ITERATIONS` | `3`                     | Max coding → test → review loops   |

To try another local model, set `OLLAMA_MODEL` (for example `qwen3:8b`) and pull that tag with Ollama.

### 4. Start SearXNG (recommended for research)

```bash
docker compose up -d
```

This starts SearXNG on port `8080`. If SearXNG is unavailable, research falls back to DuckDuckGo. If both fail, the coding agent still continues with the original task.

## Usage

Run the full pipeline with the default sample task:

```bash
npm run dev
```

The default task creates a small TypeScript package with an `add(a, b)` function and a test that `add(2, 2) === 4`.

Pass your own task as arguments:

```bash
npm run dev "Create a TypeScript CLI that counts words in a file"
```

Output is a JSON `OrchestratorResult`: task, status (`passed` or `failed`), iteration count, research report, coding notes, test report, review report, and the inter-agent message log.

Generated files land in `workspace/` (created automatically).

### Other scripts

| Script                 | Command                                                   |
| ---------------------- | --------------------------------------------------------- |
| `npm run dev`          | Run the pipeline with `tsx` (TypeScript 7, no build step) |
| `npm run build`        | Compile with TypeScript 7 (`tsc`) into `dist/`            |
| `npm start`            | Run the compiled `dist/index.js`                          |
| `npm run format`       | Format the repo with Prettier                             |
| `npm run format:check` | Check formatting without writing                          |

## Project structure

```text
src/
  index.ts                 Entry point: task + workspace + orchestrator
  config.ts                OLLAMA_MODEL, SearXNG URL, iteration limit
  agents/
    Agent.ts               Shared Ollama + tool-calling loop
    ResearchAgent.ts
    CodingAgent.ts
    TestingAgent.ts
    ReviewerAgent.ts
  orchestrator/
    Orchestrator.ts        Pipeline, retries, safe fallbacks
  communication/
    PipelineContext.ts     Shared state and message history
    handoffs.ts            Prompts passed between stages
  tools/                   File, command, and web-search tools
  search/                  SearXNG, DuckDuckGo, fallback chain
  types/                   Research, test, review, and message types
workspace/                 Files written by the coding agent
searxng/                   SearXNG Docker config
```

## Why Qwen3 4B

`qwen3:4b` is small enough to run locally on a laptop while still supporting the tool-calling loop the agents depend on: research JSON, file edits, shell commands, and structured test/review reports.

All agents share that one model. Changing `OLLAMA_MODEL` switches the whole pipeline.

## TypeScript 7

The project is compiled with **TypeScript 7** (`"typescript": "^7.0.2"` in `package.json`).

Notable `tsconfig.json` choices:

- `module` / `moduleResolution`: `NodeNext` (ESM imports must use `.js` extensions in source)
- `target`: `ESNext`
- `strict`: `true`
- `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` for tighter types
- `verbatimModuleSyntax` and `isolatedModules`

Development uses `tsx` so you can run `.ts` files directly. Production uses `npm run build` then `npm start`.
