# Development Memory

## Project
- Workspace: `/Users/ssm/Documents/Investment Analyst`
- Stack: Next.js 15 App Router, Webpack dev mode
- Main purpose: investment insight dashboard with saved daily snapshots, history, trend views, and weekly results review

## Current Product Structure
- Home page: `app/page.tsx`
- Results page: `app/Results/page.tsx`
- Lowercase alias route: `app/results/page.tsx` imports and renders `../Results/page`
- Shared types: `lib/types.ts`
- Dashboard/history loaders: `lib/dashboard.ts`
- JSON normalizers: `lib/data-normalizers.ts`
- Base-path helper: `lib/site.ts`
- Main stock row UI: `components/stock-row.tsx`
- Deploy mirror sync script: `scripts/sync-pages-root.mjs`
- Logic tests: `tests/quality.test.ts`

## Implemented Features
- Added small-cap / undervalued idea section via `components/small-cap-panel.tsx`
- Added `/Results` weekly review dashboard backed by `public/data/results/latest.json`
- Added `public/data/results/history/.gitkeep`
- Added results automation prompts:
  - `RESULTS_AUTOMATION_PROMPT.txt`
  - `RESULTS_AUTOMATION_PROMPT.md`
  - `RESULTS_AUTOMATION_RUN_PROMPT.txt`
- Home page link points to `/Results`

## History And Trend Rules
- Same calendar day can have multiple analysis runs
- History files use datetime naming such as `YYYY-MM-DDTHH-mm-ss.json`
- `lib/dashboard.ts` groups same-date snapshots and uses the latest `lastUpdated` entry as that day's representative value
- 7-day trend should therefore mean latest snapshot per day, not every run

## Stock / Quote Data Model
- `StockIdea` now supports:
  - `quoteSymbol?: string`
  - `priceSnapshot?: StockPriceSnapshot`
- `SmallCapIdea` now also supports:
  - `quoteSymbol?: string`
  - `priceSnapshot?: StockPriceSnapshot`
  - `followThroughNote?: string`
- `StockPriceSnapshot` includes:
  - `currentPrice`
  - `currency`
  - `previousCloseChangePct`
  - `week52High`
  - `week52Low`
  - `asOf`
  - `sourceNote?`
- Currency enum currently: `KRW | USD`

## UI Behavior For Price Info
- Stock rows are expandable in `components/stock-row.tsx`
- Expanded view shows only the saved analysis-time `priceSnapshot`
- `components/small-cap-panel.tsx` now also shows an analysis-time price snapshot block for `smallCapIdeas`
- small-cap cards now also show:
  - recent tracking badges such as consecutive tracked days and 7-day appearances
  - `followThroughNote` explaining why a name is still worth watching after multiple up days / multiple days of tracking
- Product decision: analysis snapshot is canonical/default and the UI no longer requests live quote data
- This avoids mixing recommendation logic with a later market price and keeps static export simpler

## Prompting Rules For Daily Automation
- Main prompt files:
  - `AUTOMATION_PROMPT.txt`
  - `AUTOMATION_PROMPT.md`
  - `AUTOMATION_RUN_PROMPT.txt`
- Prompt was updated so each stock should save price info before writing insight text
- Prompt was also updated so each `smallCapIdeas` item should save the same price info before writing `whyNow` and related text
- Required intent:
  - check current price, previous-day change, 52-week high, and 52-week low first
  - store them in `priceSnapshot`
  - then write the recommendation / thesis
- Preferred price source is now market-specific:
  - KR: Naver Finance domestic stock pages
  - US: Yahoo Finance quote/detail pages
- If a US price cannot be verified on Yahoo or key fields are blank, automation should check Naver Finance overseas/US pages once more before leaving the field empty
- If Yahoo and Naver still disagree or both look stale, leave the field blank and explain that both sources were checked in `sourceNote`
- Latest rule:
  - `smallCapIdeas` should target at least 3 names and usually land in the 4-6 range, with 6 as the practical upper bound
  - all `priceSnapshot` values must come from the latest available market-specific source page data
  - `priceDate` must reflect the actual source quote date
  - if the latest source price is older than 5 calendar days versus the analysis date, treat it as stale and do not use the number in price-based reasoning
  - if a price field cannot be verified on the chosen source, leave it blank rather than guessing or backfilling from another stale source
  - small-cap ideas should not churn daily without a clear reason; if the thesis still holds, keep them in the next run so price snapshots accumulate across days
  - each `smallCapIdeas` item should include a `followThroughNote` that explains why the idea can still work after recent gains or repeated daily tracking
- If price cannot be found, leave reason in `sourceNote`
- Because the UI only shows saved snapshots, `priceSnapshot` completeness is now directly user-visible

## Prompting Rules For Weekly Results Automation
- Saturday automation should use `RESULTS_AUTOMATION_RUN_PROMPT.txt`
- That file tells the automation to read `RESULTS_AUTOMATION_PROMPT.txt` and update `public/data/results/latest.json`
- Weekly results should use `priceSnapshot.currentPrice` as the primary source for entry/evaluation prices
- Text in `whyNow` or `rationale` is only a fallback when snapshot data is missing
- This is especially important for `smallCapIdeas`, where tracking quality depends on repeated daily snapshots

## Earlier Stability Fixes
- Duplicate React key warnings were fixed by replacing fragile keys with safer composite keys in list-rendering components
- Next devtools-related runtime issue `__webpack_modules__[moduleId] is not a function` had previously been mitigated by disabling:
  - `experimental.devtoolSegmentExplorer = false` in `next.config.ts`
- Root `next.config.ts` now supports GitHub Pages export env flags too, so the same codebase can serve local and deploy builds
- Root JSON loaders now normalize malformed or partial JSON before rendering

## Current Known Issue
- Dev build cache has been unstable
- Observed errors included:
  - `Cannot find module './331.js'`
  - missing `.next/routes-manifest.json`
  - route-level `500`
- `npm run build` had succeeded even while `npm run dev` was failing
- Root cause is treated as corrupted `.next` dev cache rather than route code
- If dev server breaks again, first recovery step is to clear `.next` and restart dev server
- Added helper script: `npm run dev:clean`
- Root `tsconfig.json` now excludes `github-pages-root/**` so local app builds are not blocked by the separate GitHub Pages copy

## Results Route Note
- Do not try to maintain both `app/Results` and `app/results` on this macOS workspace
- Filesystem is case-insensitive here, so that caused a self-import recursion and a prerender stack overflow
- Keep only `app/Results/page.tsx` as the real page and link to `/Results`

## Working Decisions To Preserve
- Use saved snapshot data for explanation and default display
- Keep history for multiple runs on the same day
- Use the latest snapshot of each day for trend aggregation
- Keep results evaluation as a separate weekly flow under `/results`
- Treat the root workspace as source of truth and sync `github-pages-root` from it instead of editing both code trees manually

## Immediate Follow-Up
- Run `npm run sync:pages` after root code, prompt, or docs change
- Run `npm test` when changing validation, normalizers, or history selection logic
- Restart dev server cleanly
- If runtime errors continue, run `npm run dev:clean`

## GPT-5.5 Handoff

### Compressed Context

```text
프로젝트: /Users/ssm/Documents/Investment Analyst
목적: KR/US 일일 섹터 분석 대시보드 + 주간 Results 복기 페이지
스택: Next.js 15 App Router, TypeScript, Tailwind, JSON 기반 렌더링
로컬 앱 주소: http://localhost:3000
소스 오브 트루스: 루트 워크스페이스
배포 구조: github-pages-root 는 별도 앱이 아니라 deploy mirror. 직접 양쪽 수정하지 말고 루트만 수정 후 `npm run sync:pages`.
배포용 GitHub Pages repo: github-pages-root 내부 git repo. push는 자동화에서 하지 않음.
중요 파일:
- /Users/ssm/Documents/Investment Analyst/developmentmemory.md
- /Users/ssm/Documents/Investment Analyst/README.md
- /Users/ssm/Documents/Investment Analyst/AUTOMATION_PROMPT.txt
- /Users/ssm/Documents/Investment Analyst/RESULTS_AUTOMATION_PROMPT.txt
- /Users/ssm/Documents/Investment Analyst/lib/dashboard.ts
- /Users/ssm/Documents/Investment Analyst/lib/data-normalizers.ts
- /Users/ssm/Documents/Investment Analyst/lib/quality.ts
- /Users/ssm/Documents/Investment Analyst/lib/types.ts
- /Users/ssm/Documents/Investment Analyst/app/page.tsx
- /Users/ssm/Documents/Investment Analyst/app/Results/page.tsx
- /Users/ssm/Documents/Investment Analyst/scripts/sync-pages-root.mjs

현재 제품 상태:
- 메인 홈: app/page.tsx
- Results: app/Results/page.tsx
- 소문자 alias route: app/results/page.tsx 가 Results를 렌더링
- public/data/latest.json, history/*.json, public/data/results/latest.json 을 읽음
- 같은 날짜에 여러 번 분석 가능하고, trend는 그 날짜의 가장 늦은 snapshot만 사용
- UI는 live quote API를 쓰지 않음. 저장된 priceSnapshot만 표시
- 종목 상세/중소형 카드 모두 priceSnapshot 확장 표시
- smallCapIdeas 섹션 있음
- Results 페이지 있음
- Results에는 benchmark 비교, confidence 배지, validation 요약이 붙음

가격/신뢰도 규칙:
- 기본 표시값은 항상 analysis-time priceSnapshot
- KR 가격 기본 소스: Naver Finance
- US 가격 기본 소스: Yahoo Finance
- US는 Yahoo에서 최신값 못 찾거나 비면 Naver Finance 해외/미국 종목 페이지 1회 추가 확인
- 둘 다 불명확하거나 충돌하면 숫자 비우고 sourceNote에 남김
- stale 기준: analysis date 대비 5일 초과
- lib/quality.ts 에서 snapshotHealth(fresh/stale/partial/missing/invalid)와 confidenceLevel(high/medium/low) 계산
- extreme daily move 30% 초과 등은 invalid 처리

자동화/프롬프트 상태:
- 일간 프롬프트는 review형이 아니라 forward sector rotation형으로 변경됨
- 핵심 목적: 향후 3~10거래일 동안 어디로 자금이 더 붙고 어디가 약해질지 선행 판단
- thesis는 최근 사실 1문장 + 앞으로의 촉매/지속성 1~2문장 + 무효화 조건 1문장 흐름
- 장 리뷰성 문장은 섹터당 1문장 이내
- challenger sector를 내부적으로 비교하도록 강화
- smallCapIdeas는 최소 3개 목표, 보통 4~6개, 최대 6개
- smallCapIdeas 는 followThroughNote 포함
- Results prompt는 benchmarkLabel 포함하도록 업데이트됨
- Results prompt는 `check:history`의 평가 가능 후보를 우선 사용하고 verified/snapshot 평가를 최소 4개 이상 채우도록 강화됨
- Results UI는 limited/mixed/fallback 평가 항목에 근거 제한 사유 박스를 표시함
- Daily automation prompt now reads latest Results lessons (`processTakeaways`, `nextWeekFocus`, `evaluatedInsights[].lesson`) as a secondary checklist before sector/stock selection

자동화 운영:
- Analyst PM / Analyst AM 자동화가 있음
- 분석 후 local data + github-pages-root/public/data 쪽 sync + commit 까지만 함
- git push는 자동화에서 제거됨 (DNS/권한 이슈 때문)
- Results 자동화도 local results + mirror sync + commit 까지만 하도록 바뀜
- publish-stock-data 별도 자동화는 paused
- 토요일 Results 평가 유지

배포/워크플로:
- github-pages-root/.github/workflows/deploy-pages.yml 사용
- Pages build 실패 원인 중 하나였던 missing app/api 가드 추가됨
- clean build step(.next/out 삭제) 추가됨
- GitHub Pages에 남아 있던 “현재 API 기준 가격” 박스는 stale build 문제였고 clean build 방향으로 수정됨

검증/테스트 상태:
- npm run build 통과
- npm test 통과
- npm run check:data 로 saved daily/results 데이터 품질을 요약 확인 가능
- npm run check:data:strict 는 daily invalid 또는 fresh 비율 저하, results verified 비율 저하를 실패 처리
- npm run check:history 로 최근 대표본의 반복 관측/평가 가능 종목 수를 확인 가능
- npm run check:mirror 로 github-pages-root 미커밋 변경 상태를 확인 가능
- tests/quality.test.ts 존재
- 테스트 커버 범위:
  - stale snapshot
  - missing snapshot
  - extreme move invalid
  - same-day latest snapshot selection
  - daily validation summary
  - results benchmark/confidence enrichment

중요 결정:
- 루트만 수정
- github-pages-root는 mirror
- UI에 live API 다시 넣지 말 것
- priceSnapshot이 canonical
- Results는 주간 복기용
- dev cache 깨지면 npm run dev:clean 우선
```

### New Chat Prompt

```text
이 대화는 기존 Investment Analyst 프로젝트의 연속 작업입니다.

먼저 아래 파일들을 읽고 현재 진행 상태를 파악하세요:
- /Users/ssm/Documents/Investment Analyst/developmentmemory.md
- /Users/ssm/Documents/Investment Analyst/README.md
- /Users/ssm/Documents/Investment Analyst/AUTOMATION_PROMPT.txt
- /Users/ssm/Documents/Investment Analyst/RESULTS_AUTOMATION_PROMPT.txt
- /Users/ssm/Documents/Investment Analyst/lib/dashboard.ts
- /Users/ssm/Documents/Investment Analyst/lib/data-normalizers.ts
- /Users/ssm/Documents/Investment Analyst/lib/quality.ts
- /Users/ssm/Documents/Investment Analyst/lib/types.ts
- /Users/ssm/Documents/Investment Analyst/app/page.tsx
- /Users/ssm/Documents/Investment Analyst/app/Results/page.tsx
- /Users/ssm/Documents/Investment Analyst/scripts/sync-pages-root.mjs
- /Users/ssm/Documents/Investment Analyst/github-pages-root/.github/workflows/deploy-pages.yml

중요 운영 규칙:
- 루트 워크스페이스가 single source of truth
- github-pages-root는 deploy mirror이므로 직접 양쪽 수정하지 말고 루트 수정 후 `npm run sync:pages`
- UI는 live quote API를 쓰지 않고 saved `priceSnapshot`만 사용
- KR 가격은 Naver 우선, US 가격은 Yahoo 우선, Yahoo 실패 시 Naver 해외/미국 페이지 1회 추가 확인
- stale 가격은 analysis date 대비 5일 초과
- 일간 프롬프트는 review형이 아니라 forward sector rotation형이어야 함
- Results는 benchmarkLabel, confidence, validation summary를 포함
- 자동화는 commit까지만 하고 push는 하지 않음

먼저 답변에서 아래 4가지를 짧게 정리하세요:
1. 현재 프로젝트가 어디까지 구현됐는지
2. 최근 중요 결정 5개
3. 남아 있는 고우선순위 리스크 3개
4. 지금 바로 이어서 할 만한 다음 작업 3개

그 다음부터 내 요청을 이어서 처리하세요.
```
