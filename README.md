# MetaBloom — Web App

Conversational system that turns natural language into valid Hearthstone outputs. Deck codes, card queries, strategy. Not a chatbot. A routed system where the LLM handles interpretation and deterministic systems handle execution.

## Problem

The output must be valid, but the input is not. Deck codes can't be approximate. Card queries can't hallucinate. But users speak loosely. The entire system exists to bridge that gap. Mapping fuzzy human intent to strict, rule-bound game structures. All structured outputs (deck codes, card queries) are guaranteed valid through deterministic execution.

## How It Works

LLM for interpretation. Deterministic systems for execution. All requests route into structured execution paths.

**Pre-routing.** Before the LLM sees anything, deterministic pattern matching catches known structures. Deck codes get detected via regex at 100% confidence, decoded, and looked up against the card database. No AI needed for that path.

**Intent detection.** A pure classifier. Not mixed logic. Determines what the user wants (card search, deck build, strategy question, general chat) and routes to the right function set.

**QueryMaster.** The biggest technical pillar. Natural language goes in, an abstract syntax tree comes out (AND/OR/NOT conditions, operators like ILIKE, BETWEEN). The AST compiles to SQL. SQL runs against PostgreSQL via AWS Lambda. The LLM decides what to query. The system guarantees how it's executed. That's how card data stays accurate without hallucination.

**Ambiguity resolution.** Early versions asked too many clarifying questions. Annoying UX. Too few and the outputs were wrong. Built a domain-aware ambiguity resolver that interprets terms like "OP" contextually (high stats, meta dominance, or value efficiency depending on context). Added a frustration signal to reduce back-and-forth. Moved from "ask, ask, ask" to "infer, adjust, only ask when necessary."

**Resilience.** The Lambda client has a circuit breaker (5 failure threshold, 30s timeout), exponential backoff with jitter, and configurable retries. Card database goes down, it fails gracefully.

## Challenges

**Making AST to SQL reliable.** Building the node types, operators, compiler, transformer, and validator. Getting it to the point where card searches actually return what the user meant, not what the LLM guessed.

**Deciding when to interpret vs when to ask.** The classic failure mode. Too many questions is annoying. Too few means wrong outputs. The ambiguity resolver with domain awareness and frustration tracking was the answer, but it took real iteration.

**Enforcing deterministic outputs inside a flexible interface.** The LLM never directly generates final structured outputs when correctness matters. Getting that separation clean meant auditing every function in the system: LLM-driven, hybrid, or pure code. Refactoring intent detection into a pure classifier. Adding a reasoning layer between classification and execution. Designing inspectable execution paths instead of black-box AI.

## Stack

Next.js 15, TypeScript, React 19, Grok (xAI), Firebase Auth/Firestore, Stripe, AWS Lambda, PostgreSQL, Zustand, Tailwind CSS
