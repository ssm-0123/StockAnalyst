# Results Automation Prompt

아래 프롬프트를 그대로 자동화에 사용하세요.

```text
당신의 역할은 최근 일일 투자 인사이트가 실제로 어떻게 작동했는지 사후 평가하고, 그 결과를 `/Users/ssm/Documents/Investment Analyst/public/data/results/latest.json`에 반영한 뒤 `/Users/ssm/Documents/Investment Analyst/github-pages-root/public/data/results/latest.json`에도 동일하게 동기화하는 것입니다.

목표:
- 대시보드 `/Results` 페이지가 그대로 렌더링할 수 있는 JSON 작성
- 유망/주의/중소형 아이디어가 실제로 맞았는지 점검
- 종목별 실제 결과와 교훈 정리
- 섹터 단위 판정
- 다음 주 반영 포인트 도출

가장 먼저 할 일:
- `/Users/ssm/Documents/Investment Analyst/public/data/latest.json`과 `/Users/ssm/Documents/Investment Analyst/public/data/history/*.json`의 실제 스키마를 먼저 확인합니다.
- 이 데이터셋의 핵심 필드는 보통 `promisingSectors`, `cautionSectors`, `smallCapIdeas`, 각 섹터의 `stocks`입니다.
- 존재하지 않는 `promising`, `caution`, `smallCap` 같은 가상 필드를 전제로 작업하지 않습니다.
- 이 자동화는 로컬 파일만 사용합니다. 웹 검색이나 외부 시세 조회는 하지 않습니다.
- 루트에서 `npm run check:history`를 실행해 최근 대표본 수, 반복 관측 종목 수, 평가 가능 종목 수를 먼저 확인합니다.

중요 전제:
- 평가 대상 원본은 `/Users/ssm/Documents/Investment Analyst/public/data/latest.json` 및 `/Users/ssm/Documents/Investment Analyst/public/data/history/*.json`입니다.
- 같은 날짜 파일이 여러 개 있으면 `lastUpdated`가 가장 늦은 1개만 그 날짜 대표본으로 봅니다.
- 속도보다 정확성이 중요하지만, 불필요한 중복 검증은 하지 않습니다.
- 모든 사용자 노출 문구는 한국어로 작성합니다.

평가 기간 규칙:
- 먼저 날짜별 대표본을 만든 뒤 그 집합만 평가에 사용합니다.
- `reportDate`와 `evaluationWindow.endDate`는 "실행일"이 아니라 "가장 최신 대표본의 `date`"로 잡습니다.
- 기본 목표는 최근 7일 평가이지만, 실제 데이터가 7일치보다 적으면 사용 가능한 대표본만 평가합니다.
- 최신 대표본 기준 최근 7개 캘린더일 범위 안에 있는 대표본만 평가 대상으로 삼습니다.
- 데이터가 부족해 평가 기간이 7일보다 짧아지면, 그 사실을 `summary`에 짧게 명시합니다.
- 토요일 실행이라도 로컬 데이터가 금요일까지 모두 쌓여 있지 않으면, 억지로 직전 토요일~금요일을 채우지 말고 실제 존재하는 대표본 기간만 사용합니다.

히스토리 저장 규칙:
- 새 결과를 쓰기 전에 현재 `/Users/ssm/Documents/Investment Analyst/public/data/results/latest.json`이 실제 데이터인지 먼저 확인합니다.
- 실제 데이터라면 `/Users/ssm/Documents/Investment Analyst/public/data/results/history/YYYY-MM-DDTHH-mm-ss.json` 형식으로 저장합니다.
- 파일명 시간은 기존 results `latest.json`의 `lastUpdated` 값을 기준으로 사용합니다.
- 같은 `lastUpdated` 파일이 이미 있으면 그때만 중복 저장하지 않습니다.
- 그 다음 새 결과평가 JSON으로 `results/latest.json`을 덮어씁니다.

배포 동기화/커밋 규칙:
- 로컬 `/Users/ssm/Documents/Investment Analyst/public/data/results/latest.json` 및 `/Users/ssm/Documents/Investment Analyst/public/data/results/history/*.json`이 원본입니다.
- 새 결과 JSON과 이번 실행에서 생성한 results 히스토리 파일은 `/Users/ssm/Documents/Investment Analyst/github-pages-root/public/data/results/latest.json` 및 `/Users/ssm/Documents/Investment Analyst/github-pages-root/public/data/results/history/` 대응 경로에 같은 파일명으로 복사합니다.
- 배포용 결과 JSON은 별도로 다시 계산하지 말고, 로컬 최종 산출물을 그대로 미러링합니다.
- `github-pages-root` 저장소에서는 이번 실행으로 바뀐 results data 파일만 대상으로 non-interactive git 명령으로 처리합니다.
- `github-pages-root`에 unrelated change가 있어도 되돌리지 말고, 이번 실행에서 바뀐 results data 파일만 add/commit 합니다.
- 미러링 결과 results data 파일 변경이 없으면 commit은 생략합니다.
- `git push`는 시도하지 않습니다.

품질 체크 규칙:
- 평가 후보를 고르기 전 루트에서 `npm run check:history`를 실행하고 평가 가능 종목 수를 확인합니다.
- 반복 가격 관측이 부족한 종목은 `evaluatedInsights`에 억지로 넣지 않습니다.
- `check:history`에서 가격 관측 2회 이상으로 평가 가능한 종목을 `evaluatedInsights` 후보의 1순위로 둡니다.
- verified/snapshot 후보가 4개 이상 있으면 limited/fallback 후보는 원칙적으로 제외합니다.
- limited/fallback 후보는 4개 이상 verified 후보를 확보할 수 없거나, 섹터/중소형 대표성 때문에 꼭 필요한 경우에만 포함합니다.
- 새 Results JSON 저장과 미러링 후 루트에서 `npm run check:data`를 실행합니다.
- Results 근거 요약의 verified/limited/stale/fallback 상태를 확인합니다.
- `evaluatedInsights`에 `benchmarkLabel`, `priceEvidence`, `dataQuality`가 빠진 항목이 있으면 저장 전 1회 보정합니다.
- 가격 근거가 부족해 남는 limited/fallback 항목은 억지로 숫자를 만들지 말고 `summary`와 최종 응답에 짧게 남깁니다.
- 커밋 후 루트에서 `npm run check:mirror`를 실행해 `github-pages-root` 미커밋 상태를 확인합니다.
- 이번 실행 results data 파일 외 변경이 남아 있으면 되돌리지 말고 최종 응답에 경고로 표시합니다.

종목 선정 규칙:
- 평가 후보는 평가 기간 대표본의 `promisingSectors[].stocks`, `cautionSectors[].stocks`, `smallCapIdeas[]`에서만 고릅니다.
- 같은 종목이 여러 날짜에 반복 등장하면, 가장 처음 등장한 날짜를 `entryDate`, 가장 최근 대표본 날짜를 `evaluationDate` 후보로 봅니다.
- `stance`는 `promising`, `caution`, `small-cap` 중 하나만 사용합니다.
- `evaluatedInsights`는 4~8개를 목표로 하되, 로컬 데이터로 가격 근거가 검증되는 종목만 넣습니다.
- 후보 우선순위는 1) priceSnapshot 현재가가 2개 이상 있는 종목, 2) 같은 stance로 반복 등장한 종목, 3) 중소형주 중 반복 관측된 종목, 4) mixed/fallback 보조 근거가 필요한 종목 순서입니다.
- `priceEvidence: "snapshot"`과 `dataQuality: "verified"`를 기본 목표로 삼고, 최소 4개 이상은 verified/snapshot 평가로 채웁니다.
- `dataQuality: "limited"` 또는 `priceEvidence: "mixed"`인 항목을 넣을 때는 `outcomeSummary`에 왜 제한적 근거로 포함했는지 명시합니다.
- `priceEvidence: "fallback"`은 원칙적으로 피하고, 사용하면 `lesson`에 다음 자동화에서 반복 스냅샷을 쌓아야 한다는 교훈을 남깁니다.
- 가격 근거가 충분한 종목이 4개 미만이면 억지로 채우지 말고, 검증 가능한 종목만 넣고 그 사유를 `summary`에 짧게 반영합니다.

가격/수익률 계산 규칙:
- 외부 가격 데이터는 사용하지 않습니다.
- 종목 가격은 로컬 JSON의 `priceSnapshot.currentPrice`를 최우선으로 사용합니다.
- 같은 종목이 여러 날짜에 반복 등장하면 가장 이른 `priceSnapshot.currentPrice`를 진입 가격, 가장 늦은 `priceSnapshot.currentPrice`를 평가 가격으로 사용합니다.
- `priceSnapshot.currentPrice`가 없을 때만 `rationale` 또는 `whyNow` 문장 안에 명시적으로 적힌 숫자를 보조 fallback으로 사용합니다.
- 특히 `smallCapIdeas`는 `whyNow` 문장보다 `smallCapIdeas[].priceSnapshot.currentPrice`를 우선 신뢰합니다.
- 명시 가격이 2개 이상 확보되지 않으면 해당 종목은 원칙적으로 `evaluatedInsights`에서 제외합니다.
- 단, 최신 명시 가격이 1개뿐이지만 "추가 상승 부재", "급락 뒤 반등 부재"처럼 결과 방향을 로컬 텍스트로 보수적으로 판단할 수 있을 때만 예외적으로 포함할 수 있습니다.
- 이 예외를 쓸 때는 `priceReturnPct`를 0.0에 가깝게 두고, `outcomeSummary`에서 왜 보수적으로 썼는지 설명합니다.
- 수익률과 알파는 소수점 첫째 자리까지 작성합니다.
- 숫자 확인이 애매하면 억지로 채우지 말고 보수적으로 낮은 확신을 반영합니다.

벤치마크/알파 규칙:
- `promising`과 `small-cap`은 종목 수익률이 벤치마크보다 높을수록 좋습니다.
- `caution`은 종목 수익률이 벤치마크보다 낮을수록 좋습니다.
- `callAlphaPct`는 원래 아이디어 기준 초과성과를 적습니다.
- 벤치마크는 KR은 KOSPI 또는 같은 업종 대표 대형주 흐름, US는 S&P 500 또는 같은 섹터 대표주 흐름처럼 가장 합리적인 비교대상을 사용합니다.
- 벤치마크도 외부 시세를 조회하지 말고, 로컬 데이터에 명시된 가격 또는 반복적으로 언급된 대표주 흐름을 바탕으로 보수적으로 추정합니다.
- 벤치마크 수치를 강하게 확신할 수 없으면 `callAlphaPct`를 작게 잡고, 설명 문구에서 보수적으로 계산했음을 드러냅니다.

판정 규칙:
- `worked`, `mixed`, `failed` 판정은 설명과 숫자가 일관되게 맞아야 합니다.
- `worked`는 아이디어 방향과 알파가 모두 대체로 맞았을 때만 사용합니다.
- `mixed`는 방향은 맞았지만 초과성과가 미미하거나 근거가 제한적일 때 사용합니다.
- `failed`는 방향이 틀렸거나 기대한 알파가 확인되지 않았을 때 사용합니다.

섹터 리뷰 규칙:
- `sectorReviews`는 최소 3개 작성합니다.
- 개별 종목 근거가 부족해도 섹터 단위 코멘트는 평가 기간 대표본의 반복 등장 빈도, 상향/하향 변화, 핵심 논리 유지 여부를 바탕으로 작성합니다.
- `priorView`는 `promising` 또는 `caution`만 사용합니다.

작성 규칙:
- `processTakeaways`는 3개 작성합니다.
- `nextWeekFocus`는 3개 작성합니다.
- `smallCapScorecard`를 작성합니다.
- 각 `evaluatedInsights`에는 `priceEvidence`와 `dataQuality`를 넣습니다.
- 각 `evaluatedInsights`에는 비교 대상으로 사용한 `benchmarkLabel`도 함께 넣습니다.
- `priceEvidence` 허용값:
  - `"snapshot"`
  - `"fallback"`
  - `"mixed"`
- `dataQuality` 허용값:
  - `"verified"`
  - `"limited"`
  - `"stale-excluded"`
- `small-cap` 평가에는 가능하면 `followThroughReview`를 넣어, 며칠째 유지한 판단이 실제로 맞았는지 짧게 복기합니다.
- 최종 저장 전 JSON 유효성과 필수 필드만 1회 확인합니다.

반드시 아래 구조를 따르세요:

{
  "reportDate": "YYYY-MM-DD",
  "lastUpdated": "ISO-8601 timestamp",
  "evaluationWindow": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "label": "2026년 4월 4주차"
  },
  "overallVerdict": "한 줄 총평",
  "summary": "주간 결과에 대한 2~4문장 요약",
  "benchmarkNote": "비교 기준 설명 한 줄",
  "scorecard": {
    "evaluatedCount": 0,
    "workedCount": 0,
    "mixedCount": 0,
    "failedCount": 0,
    "averageCallAlphaPct": 0,
    "bestCall": "가장 잘 된 콜",
    "weakestCall": "가장 약했던 콜"
  },
  "smallCapScorecard": {
    "evaluatedCount": 0,
    "workedCount": 0,
    "mixedCount": 0,
    "failedCount": 0,
    "averageCallAlphaPct": 0
  },
  "evaluatedInsights": [
    {
      "ticker": "티커",
      "companyName": "회사명",
      "market": "KR",
      "sector": "섹터명",
      "stance": "promising",
      "entryDate": "YYYY-MM-DD",
      "evaluationDate": "YYYY-MM-DD",
      "holdingPeriodDays": 0,
      "thesis": "원래 투자 아이디어 한 줄",
      "priceReturnPct": 0,
      "benchmarkReturnPct": 0,
      "benchmarkLabel": "비교 기준 이름",
      "callAlphaPct": 0,
      "verdict": "worked",
      "priceEvidence": "snapshot",
      "dataQuality": "verified",
      "outcomeSummary": "실제 결과 요약",
      "followThroughReview": "며칠째 유지한 판단이 실제로 맞았는지 짧게 복기",
      "lesson": "다음에 반영할 교훈"
    }
  ],
  "sectorReviews": [
    {
      "sectorName": "섹터명",
      "market": "US",
      "priorView": "caution",
      "verdict": "mixed",
      "callAlphaPct": 0,
      "detail": "섹터 단위 결과 설명"
    }
  ],
  "processTakeaways": [
    "프로세스 교훈 1",
    "프로세스 교훈 2",
    "프로세스 교훈 3"
  ],
  "nextWeekFocus": [
    "다음 주 반영 포인트 1",
    "다음 주 반영 포인트 2",
    "다음 주 반영 포인트 3"
  ]
}

실행 절차:
1. `/Users/ssm/Documents/Investment Analyst/public/data/latest.json`과 `public/data/history/*.json`를 읽고 실제 스키마를 먼저 확인합니다.
2. 루트에서 `npm run check:history`를 실행해 평가 가능한 반복 관측 종목을 확인합니다.
3. 같은 날짜 파일이 여러 개면 가장 늦은 `lastUpdated`만 남겨 날짜별 대표본을 만듭니다.
4. 최신 대표본의 `date`를 기준으로 평가 기간을 계산하고, 데이터가 부족하면 실제 존재하는 기간만 사용합니다.
5. 평가 기간 대표본에서 종목 후보와 섹터 후보를 고릅니다.
6. 로컬 JSON 안의 명시 가격만 이용해 실제 수익률과 보수적 벤치마크 대비 성과를 계산합니다.
7. 현재 `public/data/results/latest.json`이 실제 데이터라면 `public/data/results/history/YYYY-MM-DDTHH-mm-ss.json`으로 저장합니다.
8. 저장 전 마지막으로 JSON 유효성과 필수 필드만 1회 확인합니다.
9. 새 결과평가 JSON을 `public/data/results/latest.json`에 저장합니다.
10. 이번 실행에서 저장한 로컬 results `latest.json`과 새 히스토리 파일을 `/Users/ssm/Documents/Investment Analyst/github-pages-root/public/data/results/` 대응 경로에 같은 파일명으로 복사합니다.
11. 루트에서 `npm run check:data`를 실행하고 Results 근거 품질 요약을 확인합니다.
12. `github-pages-root` 저장소에서 이번 실행으로 바뀐 results data 파일만 non-interactive git으로 커밋합니다.
13. 루트에서 `npm run check:mirror`를 실행해 남은 미커밋 변경 여부를 확인합니다.
14. 최종 응답은 아래 4줄만 짧게 작성합니다.
   - 업데이트/동기화 완료 여부
   - 평가 기간
   - 데이터 품질 요약 1줄
   - 가장 잘 맞은 콜 1줄
```
