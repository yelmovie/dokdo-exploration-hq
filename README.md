# 독도 탐사본부: 사라진 기록을 복원하라 (dokdo-exploration-hq)

초등 4학년 심화 독도교육 게임형 웹앱. 학생이 위치·지형·역사·생태·보호 5개 영역의 근거를
게임형 미션으로 수집해 브리핑 보드와 발표문을 완성한다.

- 바닐라 JS ES모듈 · 빌드 없음 · 백엔드 없음 (localStorage 저장)
- 16:9 태블릿 가로형 기준 (1280×720 스테이지를 화면 크기에 맞춰 비율 스케일)
- 교육 사실 출처: 대한민국 외교부 독도 (dokdo.mofa.go.kr)

## 실행

```bash
python serve.py
```

→ http://localhost:8123 (ES모듈이라 file:// 직접 열기는 안 됨)

씬 딥링크: `#main` `#briefing` `#missionMap` `#route` `#geology` `#history`
`#ecology` `#briefingBoard` `#presentation` `#completion`

## 페이지 구성 (10)

| # | 씬 | 핵심 조작 |
|---|---|---|
| 1 | 메인 화면 | 시작 / 이어하기(저장 감지) / 선생님 안내(리셋) |
| 2 | 탐사본부 브리핑 | 목표 카드 5장 열람 게이팅 |
| 3 | 미션 지도 | 항로형 노드, 잠금/해금, 배지 |
| 4 | 항로 복원실 | 항해 일지 순서 배열 → 자료 해석 퀴즈 3 |
| 5 | 바위섬 분석실 | 지형 단서 4개 수집 게이팅 → 복수정답·자료비교·원인결과 |
| 6 | 기록 보관소 | 연표 복원 → 자료 매칭 → 사실/생각 구분 |
| 7 | 생태 수호 작전 | 관찰 구역 3곳 → 상황 판단 + 영향 예측 |
| 8 | 브리핑 보드 제작 | 근거 카드 드래그/탭 배치, 약한 근거 걸러내기 |
| 9 | 최종 발표 준비 | 발표 순서 배열 → 빈칸 채우기 → 문장 개선 → 리허설 |
| 10 | 수료 및 전시 | 수료증·배지·보호 다짐·성찰·결과 다시보기 |

공통 규칙: 오답 시 정답 비공개 + 힌트 재도전(3회 오답 시 강한 힌트), no-fail.

## 폴더

```
index.html, serve.py
public/assets/        최적화 에셋 (bg_*.jpg 1280×720, icons/dokdo/1~81.png, bgm_*.mp3)
assets/               원본 에셋 뱅크 (한글 파일명 원본 — 직접 참조 금지)
src/
  core/               app.js(라우터·fitStage), dom.js
  config/             assetManifest.js(별칭 전담), pageConfig.js
  data/               missions.js, questions.js(문제은행)
  managers/           SaveManager.js, AudioManager.js
  components/         ui.js, interactions.js
  scenes/             10개 씬 + _shared.js
_recovered/           2026-07 옛 앱에서 복구한 코드(3D 컴포넌트 등, 참고용)
```

## 유지보수 규칙

- 에셋 경로는 반드시 `src/config/assetManifest.js` 별칭으로만 접근 (한글·공백 파일명 직접 참조 금지)
- 문제·정답·해설·출처는 `src/data/questions.js` 에만 둔다 (씬 코드에 박지 않기)
- 저장 키 `dokdo_exploration_hq_save_v1` 스키마 변경 금지 — 필드 추가는 SaveManager 의 migrate 병합으로
- 효과음은 WebAudio 합성음(파일 불필요). mp3 효과음을 추가하려면 AudioManager 만 수정
- 3D(three.js) 재도입 시 `_recovered/subagents/src/components/three/` 참고

## 저장 데이터 주의 (origin 분리)

진행 기록은 브라우저 localStorage 에 **주소(origin)별로 따로** 저장된다.
`localhost:8123` 에서 하던 기록과 `dokdo-hq.vercel.app` 의 기록은 서로 다른 저장소다.
수업은 한 주소로만 진행할 것.

## 에셋 정책 (asset-bank)

- `assets/` = 원본 보관소(백업). 한글·공백 파일명 그대로 두고 **코드에서 직접 참조 금지**.
- `public/assets/` = 앱이 실제로 쓰는 최적화본. 배포에는 이것만 나간다(`.vercelignore` 로 원본 제외).
- 원본과 최적화본의 이중 보관은 의도된 구조다 — 2026-07 코드 유실 사고 이후 원본 백업을 저장소에 유지한다.

## 저작권

배경·캐릭터·아이콘 이미지는 생성형 AI로 제작한 교육용 이미지(앱 설정 화면에 고지).
교육 내용 문장은 외교부 독도 공식 자료를 근거로 작성. 수업 사용 전 교사 검토 권장.
