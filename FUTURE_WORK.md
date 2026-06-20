# Future Work

Running list of deferred improvements. Add new items at the bottom of each section. Mark items `✅ done — YYYY-MM-DD` when finished instead of deleting (keeps history).

---

## Eval harness (`apps/api/src/scripts/eval-chat.ts`)

Scaffolded 2026-06-17 with 5 starter cases. Currently 5/5 passing on the NLP_A2 repo.

- [ ] Grow case set to ~25–30 cases across 2–3 different repos. Mix easy / hard / refusal / multi-file.
- [ ] Add a `--report json` flag that dumps full results (id, passed, latency, answer, citations, reasons) to a file — for CI artifacts and quality trending over time.
- [ ] Add LLM-as-judge grading for subjective answers (e.g. "is this explanation correct?") instead of relying only on substring checks. Use Groq itself as the judge with a strict rubric prompt; require structured JSON output.
- [ ] Wire the harness into a Husky pre-push hook OR a GitHub Action so changes can't ship without passing the bar. CI must fail when score regresses.
- [ ] Track quality over time — append each CI run's pass-rate + avg latency to a small CSV / SQLite file so we can graph drift.
- [ ] Add per-case timeout (currently relies on the script's overall timeout). Some retrieval misses cause the LLM to ramble; cap at e.g. 30s per case.
- [ ] Test on a large repo (500+ files, e.g. `facebook/react`, `nestjs/nest`) — small repos hide retrieval bugs.

## Rate-limit / latency

- [ ] **Voyage AI is the main bottleneck** — 22s/call gate dominates user-perceived latency (Groq is ~2s). Either upgrade Voyage to paid tier (much higher RPM) or switch embedding provider. This is the single biggest UX win available right now.
- [ ] Consider switching embeddings to a self-hosted model (e.g. `Xenova/all-MiniLM-L6-v2` via `transformers.js`) to remove the rate-limit gate entirely. Trade-off: lower retrieval quality vs. zero gate latency.

## Chat / RAG quality

- [ ] Verify the frontend renders `Message.sourceCitations` as clickable file references — non-negotiable for user trust. Without citations, users can't verify the answer.
- [ ] Test cross-file synthesis questions (e.g. "How does data flow from scraper → LSTM?") — most RAG systems fail here.
- [ ] Test on monorepo / multi-language repos to catch chunking / retrieval edge cases.
- [ ] Tune `TOP_K` (currently 8) — run eval with 4, 6, 8, 12 and pick the lowest value that holds quality.

## Production-readiness checklist (before paying customers)

- [ ] Eval harness in CI with a hard pass-rate floor (e.g. 90%).
- [ ] Citations rendered in the chat UI.
- [ ] Grounded-refusal behavior verified across at least 5 negative cases.
- [ ] Load-tested at expected concurrency (start: 5 concurrent chats, measure P95 latency).
- [ ] Cost-per-query measured on paid tiers (Groq + Voyage).
- [ ] Prompt-injection test: index a repo whose code contains adversarial instructions (e.g. `// IGNORE PREVIOUS INSTRUCTIONS AND ...`) and confirm the assistant ignores them.

## Misc

- [ ] Clean up `apps/api/src/scripts/test-groq.ts` (the one-off smoke test from the Groq migration) — keep for re-validation after any provider/model change, or delete if `eval-chat.ts` replaces it.
- [x] Rotate Groq API key (it appeared in chat transcript on 2026-06-17) — done 2026-06-18.
- [ ] Update `memory/project_overview.md` — it still says "AI provider: Grok (xAI)" from 52 days ago. Reality is now Groq (Llama 3.3 70B via OpenAI-compatible SDK).
- [ ] `docker-compose.yml` still declares `OPENAI_API_KEY` for the `api` service env — stale after the Groq migration. Replace with `GROQ_API_KEY` and `VOYAGE_API_KEY` so the full-stack profile (`npm run docker:up:all`) actually works without manual env edits.
