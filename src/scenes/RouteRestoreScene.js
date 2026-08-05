/* =========================================================================
   4페이지 - 항로 복원실 (RouteRestoreScene)
   0단계: 항해 일지 순서 배열로 울릉도→독도 항로 복원(게이팅)
   → 1~3단계: 방향·거리·지도 표식 자료 해석 퀴즈.
   오답은 정답 비공개 + 힌트 후 재도전.
   (2026-07 옛 앱 복구본에서 3D 해도 부분을 제외하고 이식 — 3D는 이후 단계)
   ========================================================================= */
import { el } from "../core/dom.js";
import { buildScene, placeAsset, quiz, pos, collapsible } from "../components/ui.js";
import { missionFrame, hintFold, nextCoachButton, completeMission } from "./_shared.js";
import { orderInteraction } from "../components/interactions.js";
import { DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { ROUTE_QUESTIONS, ROUTE_PATH } from "../data/questions.js";

export default function RouteRestoreScene(ctx) {
  const cfg = PAGES.route;
  const { root, layer } = buildScene({ bg: cfg.bg, veil: "soft" });
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
        ["📍", "위치", "울릉도의 동쪽 약 87.4km"],
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

  /* ---- 항로 단서 칩(방향/거리/지형) — ROUTE_PATH.nodes 의 hint 활용 ---- */
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

  /* ---- 중앙 활동 보드 ---- */
  const board = el("div.q-board", { style: { ...pos(270, 108, 740, 566) } }, [el("div.q-board__clip")]);
  const qTitle = el("div.q-board__title", { style: { fontSize: "19px" } });
  const workArea = el("div", { style: { flex: "1", minHeight: "0", overflowY: "auto", position: "relative", paddingRight: "4px" } });

  /* ---- 하단: 힌트 토글 ---- */
  const hintHolder = el("div");
  layer.appendChild(hintHolder);

  /* 항로 복원 완료 → 코치 버튼으로 문제 진입 */
  function onRouteComplete() {
    if (routeDone) return;
    routeDone = true;
    const donePane = el("div.col", {
      style: { alignItems: "center", justifyContent: "center", gap: "10px", minHeight: "90px", background: "#e9f8ec", border: "2px solid #2f9e44", borderRadius: "14px", padding: "12px" },
    }, [
      el("div", { style: { fontWeight: "900", fontSize: "16px", color: "#1d6b2e" }, text: "⚓ 항로 복원 완료! 울릉도 → 독도 약 87.4km" }),
      nextCoachButton("문제 풀기 시작", () => renderQuiz(), { icon: "📜" }),
    ]);
    workArea.innerHTML = "";
    workArea.appendChild(donePane);
  }

  /* 1~3단계: 자료 해석 퀴즈 */
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

  /* 0단계: 항로 복원 */
  function renderRoutePhase() {
    frame.setStep(1, totalSteps);
    qTitle.innerHTML = "";
    qTitle.appendChild(el("span", { html: "<b>0단계.</b> " + ROUTE_PATH.prompt }));
    hintHolder.innerHTML = "";
    hintHolder.appendChild(hintFold("항해 일지는 ‘출발 → 이동 → 발견 → 도착’ 순서로 적혀 있어요. 단서 칩과 짝지어 봐요.", { x: 22, y: 640 }));
  }

  /* ---- 보드 조립: 순서 배열 활동 + 단서 칩 ---- */
  board.appendChild(qTitle);
  board.appendChild(clueRow);
  const order = orderInteraction({
    items: ROUTE_PATH.nodes.map((n) => ({ id: n.id, label: n.label })),
    answer: ROUTE_PATH.answer,
    slotW: 148, slotH: 80,
    onResult: (ok) => { if (ok) onRouteComplete(); },
  });
  const fallbackWrap = el("div", { style: { flex: "0 0 auto" } }, [order.node]);
  board.appendChild(fallbackWrap);
  board.appendChild(workArea);
  layer.appendChild(board);

  renderRoutePhase();
  return root;
}
