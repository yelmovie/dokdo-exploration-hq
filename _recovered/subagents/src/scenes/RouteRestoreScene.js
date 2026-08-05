/* =========================================================================
   4페이지 - 항로 복원실 (RouteRestoreScene) / 위치 (샘플 4 대응)
   0단계: 3D 해도(three.js)에서 부표를 순서대로 탭해 울릉도→독도 항로 복원
   → 1~3단계: 방향·거리·지도 표식 자료 해석 퀴즈.
   항로를 복원하기 전에는 문제 패널이 잠긴다(게이팅).
   WebGL 미지원 기기는 2D 순서 배열(orderInteraction) 폴백으로 동일 흐름.
   오답은 정답 비공개 + 힌트 후 재도전.
   ========================================================================= */
import { el } from "../core/dom.js";
import { buildScene, placeAsset, quiz, pos, collapsible, toast } from "../components/ui.js";
import { missionFrame, hintFold, nextCoachButton, completeMission } from "./_shared.js";
import { orderInteraction } from "../components/interactions.js";
import { supportsWebGL } from "../components/three/ThreeStage.js";
import { createRouteChart3D } from "../components/three/RouteChart3D.js";
import { DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { ROUTE_QUESTIONS, ROUTE_PATH } from "../data/questions.js";

export default function RouteRestoreScene(ctx) {
  const cfg = PAGES.route;
  const { root, layer } = buildScene({ bg: cfg.bg, veil: "soft" });
  const use3D = supportsWebGL();
  const totalSteps = ROUTE_QUESTIONS.length + 1; // 0단계(항로 복원) + 문제 3
  let qi = 0;
  let routeDone = false;

  const frame = missionFrame(ctx, layer, cfg, {
    signSrc: DOKDO.signRoute,
    helpText: "단서 칩을 읽고 항로를 먼저 복원한 뒤, 방향·거리·지도 표식 문제를 풀어요.",
  });

  /* ---- 좌측: 탐험 정보 토글(기본 접힘) ---- */
  layer.appendChild(collapsible({
    title: "독도 탐험 정보", icon: "🏝️",
    style: { ...pos(22, 96), zIndex: 9 },
    body: [
      el("div.feature-list", {}, [
        ["📍", "위치", "울릉도의 동남쪽 약 87.4km"],
        ["🏝️", "구성", "동도·서도 + 주변 부속도서"],
        ["🌊", "바다", "동해 한가운데"],
      ].map(([i, t, d]) => el("div.feature-row", {}, [
        el("span.f-ico", { text: i }),
        el("div", {}, [
          el("div", { style: { fontWeight: "900", fontSize: "14px" }, text: t }),
          el("div", { style: { fontWeight: "600", fontSize: "13px", color: "var(--ink-soft)" }, text: d }),
        ]),
      ]))),
    ],
  }));

  /* ---- 캐릭터 ---- */
  placeAsset(layer, DOKDO.boyScout, { x: 6, y: 400, w: 250, h: 320, alt: "탐험가 소년", z: 3 });
  placeAsset(layer, DOKDO.otterSailor, { x: 1050, y: 430, w: 210, h: 280, alt: "수달 항해사", float: true, z: 3 });

  /* ---- 항로 단서 칩(방향/거리/지형) — ROUTE_PATH.nodes의 hint 활용 ---- */
  const H = Object.fromEntries(ROUTE_PATH.nodes.map((n) => [n.id, n.hint]));
  const chipStyle = {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "#fdf6e3", border: "1.5px solid rgba(160,120,50,.35)",
    borderRadius: "999px", padding: "4px 11px",
    fontSize: "12.5px", fontWeight: "800", color: "var(--ink)", whiteSpace: "nowrap",
  };
  const clueRow = el("div.row", { style: { gap: "8px", justifyContent: "center", flexWrap: "wrap", flex: "0 0 auto" } },
    [
      ["🧭", "방향", `${H.n1}(울릉도)에서 해 뜨는 쪽으로`],
      ["📏", "거리", "울릉도에서 약 87.4km 바닷길"],
      ["⛰️", "지형", `${H.n3} 두 봉우리와 ${H.n4}`],
    ].map(([ico, tag, txt]) => el("div", { style: chipStyle }, [
      el("span", { text: ico }),
      el("b", { text: tag, style: { color: "var(--sea)" } }),
      el("span", { text: txt }),
    ])));

  /* 오답 힌트(정답 비공개): 다음에 이어야 할 단계의 '단서 종류'만 가리킨다 */
  const WRONG_HINTS = [
    "항해는 출발지부터예요. 단서 칩에서 배가 떠난 섬을 찾아봐요.",
    "출발 다음은 방향이에요. 단서 칩의 방향 단서를 다시 읽어 봐요.",
    "이동하다 보면 무엇이 먼저 보였을까요? 지형 단서를 다시 봐요.",
    "마지막 순서예요. 이 항해의 도착지가 어디인지 생각해요.",
  ];

  /* ---- 중앙 활동 보드: 제목 + 3D 해도(또는 2D 폴백) + 단서 칩 + 작업 영역 ---- */
  const board = el("div.q-board", { style: { ...pos(270, 108, 740, 566) } }, [el("div.q-board__clip")]);
  const qTitle = el("div.q-board__title", { style: { fontSize: "19px" } });
  const workArea = el("div", { style: { flex: "1", minHeight: "0", overflowY: "auto", position: "relative", paddingRight: "4px" } });

  /* 게이팅: 항로 복원 전에는 문제 패널 잠금 */
  const lockPane = el("div.col", {
    style: { alignItems: "center", justifyContent: "center", gap: "8px", minHeight: "110px", height: "100%", background: "rgba(255,255,255,.6)", border: "2px dashed var(--panel-line)", borderRadius: "14px", textAlign: "center", padding: "10px" },
  }, [
    el("div", { style: { fontSize: "24px" }, text: "🔒" }),
    el("div", { style: { fontWeight: "900", fontSize: "16px", color: "var(--navy)" }, text: "항로를 먼저 복원해요" }),
    el("div", { style: { fontWeight: "700", fontSize: "13px", color: "var(--ink-soft)" },
      text: use3D ? "해도의 부표를 단서 순서대로 눌러 항로를 이어요" : "카드를 순서대로 슬롯에 담아 항로를 복원해요" }),
  ]);
  workArea.appendChild(lockPane);

  /* ---- 하단: 힌트 토글 ---- */
  const hintHolder = el("div");
  layer.appendChild(hintHolder);

  /* 항로 복원 완료 → 잠금 해제 + 문제로 진행하는 코치 버튼 */
  function onRouteComplete() {
    if (routeDone) return;
    routeDone = true;
    lockPane.innerHTML = "";
    Object.assign(lockPane.style, { background: "#e9f8ec", border: "2px solid #2f9e44" });
    lockPane.appendChild(el("div", { style: { fontWeight: "900", fontSize: "16px", color: "#1d6b2e" }, text: "⚓ 항로 복원 완료! 울릉도 → 독도 약 87.4km" }));
    lockPane.appendChild(nextCoachButton("문제 풀기 시작", () => renderQuiz(), { icon: "📜" }));
  }

  /* 1~3단계: 기존 퀴즈 3문항 (항로 복원 후에만 진입) */
  function renderQuiz() {
    clueRow.style.display = "none";
    if (fallbackWrap) fallbackWrap.style.display = "none";
    const q = ROUTE_QUESTIONS[qi];
    frame.setStep(qi + 2, totalSteps);
    qTitle.innerHTML = "";
    qTitle.appendChild(el("span", { html: `<b>문제 ${qi + 1}.</b> ` + q.prompt }));

    workArea.innerHTML = "";
    workArea.appendChild(el("div", {
      style: { background: "#fdf6e3", border: "1.5px solid rgba(160,120,50,.3)", borderRadius: "10px", padding: "6px 12px", fontSize: "13.5px", fontWeight: "700", color: "var(--ink)", marginBottom: "10px" },
      html: "🧭 <b>항해 기록(단서)</b> · " + (q.clue || "방향·거리·지도 표식을 함께 읽어요"),
    }));

    const nextHolder = el("div.row", { style: { justifyContent: "flex-end", minHeight: "0" } });
    const qc = quiz(q, { layout: "grid", confirmLabel: "정답 확인", onResult: (ok) => {
      if (!ok) return;
      if (qi < ROUTE_QUESTIONS.length - 1) {
        nextHolder.appendChild(nextCoachButton("다음 문제", () => { qi++; renderQuiz(); }));
      } else {
        nextHolder.appendChild(nextCoachButton("미션 완료!", () =>
          completeMission(ctx, "route", { evidence: "c-loc", message: "독도는 울릉도 동쪽 바다, 동도·서도 중심임을 확인했어요." }), { icon: "🏅" }));
      }
    } });
    workArea.appendChild(qc.node);
    workArea.appendChild(nextHolder);

    hintHolder.innerHTML = "";
    hintHolder.appendChild(hintFold(q.clue || "방향·거리·지도 표식을 함께 읽어요", { x: 22, y: 640 }));
  }

  /* 0단계: 항로 복원 화면 상태 */
  function renderRoutePhase() {
    frame.setStep(1, totalSteps);
    qTitle.innerHTML = "";
    qTitle.appendChild(el("span", { html: "<b>0단계.</b> " + ROUTE_PATH.prompt }));
    hintHolder.innerHTML = "";
    hintHolder.appendChild(hintFold("항해 일지는 ‘출발 → 이동 → 발견 → 도착’ 순서로 적혀 있어요. 단서 칩과 짝지어 봐요.", { x: 22, y: 640 }));
  }

  /* ---- 보드 조립: 3D 해도 또는 2D 순서 배열 폴백 ---- */
  let fallbackWrap = null;
  board.appendChild(qTitle);
  if (use3D) {
    const chart = createRouteChart3D({
      root, nodes: ROUTE_PATH.nodes, answer: ROUTE_PATH.answer, width: 680, height: 256,
      onWrong: (expectedIdx) => toast(ctx.stage, "💡 " + WRONG_HINTS[Math.min(expectedIdx, WRONG_HINTS.length - 1)]),
      onComplete: onRouteComplete,
    });
    board.appendChild(el("div", { style: { display: "flex", justifyContent: "center", flex: "0 0 auto" } }, [chart.el]));
    board.appendChild(clueRow);
  } else {
    /* 2D 폴백: 동일 게이팅으로 순서 배열 활동 */
    board.appendChild(clueRow);
    const order = orderInteraction({
      items: ROUTE_PATH.nodes.map((n) => ({ id: n.id, label: n.label })),
      answer: ROUTE_PATH.answer,
      slotW: 148, slotH: 80,
      onResult: (ok) => { if (ok) onRouteComplete(); },
    });
    fallbackWrap = el("div", { style: { flex: "0 0 auto" } }, [order.node]);
    board.appendChild(fallbackWrap);
  }
  board.appendChild(workArea);
  layer.appendChild(board);

  renderRoutePhase();
  return root;
}
