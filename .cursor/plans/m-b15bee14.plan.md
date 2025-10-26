<!-- b15bee14-ed62-4661-b370-b18a4bcf565e f4bec7c0-0a88-407c-8a9d-4f55df4bd794 -->
# MCP RAG Stabilization and Embedding Upgrade Plan

## Objectives

- Fix AI Agent not answering by ensuring MCP_Fetch reliably returns full content.
- Keep architecture aligned with MCP Management while enabling short-term functionality.
- Replace mock embeddings with a real, small-dimension model and optimize chunking.

## Phase 1: Immediate Reliability (n8n-only, no backend changes)

1. Add 4 explicit HTTP Request nodes in MCP Server workflow:

- `MCP_Fetch_FAQ → https://test.rajagadget.live/api/cms/faq`
- `MCP_Fetch_Activities → https://test.rajagadget.live/api/cms/activities`
- `MCP_Fetch_News → https://test.rajagadget.live/api/cms/news`
- `MCP_Fetch_Pages → https://test.rajagadget.live/api/cms/pages`

2. In AI Agent tool-calling logic: after `MCP_Search`, route IDs per type to the corresponding node; merge results for the final answer.
3. Fix n8n data mapping to prevent `branding` type:

- Derive `content_type` strictly from `response[0].hits[].type` and whitelist: `['faq','activities','news','pages']`.
- Reject/ignore any non-whitelisted type.

4. Keep current system message; add a guard: "Only use types in ['faq','activities','news','pages']".

## Phase 2: Backend Alignment with MCP Management

1. Implement/fix MCP public endpoints to return 200 with auth:

- `/api/mcp/public/faq`, `/activities`, `/news`, `/pages`
- Ensure `validateMCPApiKey` accepts your active public key and returns `auth.type = 'public'`.

2. Make endpoints return:

- `GET ...?ids=...&fields=...&language=...&limit=...`
- JSON with items array (plain text fields), not vectors.

3. Add audit + rate limiting already present to each route; verify with a smoke test.
4. Update MCP Management "Active Endpoints" to reflect green status.

## Phase 3: Real Embedding Upgrade (small dimension + chunking)

1. Choose model: Transformers.js `Xenova/all-MiniLM-L6-v2` (384D, multilingual acceptable for th/en).
2. Update schema:

- Change `cms_embeddings.embedding` to `vector(384)` and reindex ivfflat.

3. Implement embedder:

- Lazy-load pipeline, `pooling='mean'`, `normalize=true`.

4. Chunking policy:

- 200–400 chars (1–2 sentences for FAQ; one paragraph for news/activities/pages).
- Store `chunk_id`, `language`, `type`, `item_id`, `content`.

5. Rebuild embeddings via existing `Embedding Trigger` UI, with progress tracked in `embedding_jobs`.

## Phase 4: Migration Back to Single Dynamic MCP_Fetch

1. Swap n8n to one dynamic node: `https://test.rajagadget.live/api/mcp/public/{{ $json.content_type }}`.
2. Keep whitelist guard in mapping to block stray types (e.g., `branding`).
3. Regression tests: Thai/English queries; verify MCP_Fetch called; AI answers include correct sources.

## Quality Gates

- MCP_Fetch success rate > 99% across 4 types
- Average response time < 5s (LineOA end-to-end)
- Search relevance validated on a 20-query set (th/en)
- No 401/404 from MCP public endpoints

## Deliverables

- Updated n8n MCP Server workflow (4-node stopgap, then single-node migration)
- Working MCP public endpoints with auth
- Real embeddings in `cms_embeddings` (384D) + reindex
- Short chunking policy documented
- System message tweak (whitelist guard)

### To-dos

- [ ] Add 4 HTTP Request nodes for faq/news/pages/activities and route IDs per type
- [ ] Add whitelist mapping to block non-supported content types (branding)
- [ ] Fix MCP public endpoints auth and response contract for 4 content types
- [x] Implement Transformers.js embedder (384D) and lazy-load pipeline
- [x] Alter cms_embeddings to vector(384) and rebuild ivfflat index
- [x] Apply 200–400 char chunking and update Embedding Trigger to use it
- [ ] Run Embedding Trigger full reindex and verify embedding_jobs
- [ ] Migrate back to single dynamic MCP_Fetch against /api/mcp/public
- [ ] Create smoke tests th/en to verify answers and endpoint health
- [ ] Add system message guard for allowed types and MCP_Fetch requirement