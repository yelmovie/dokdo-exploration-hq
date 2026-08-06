/* =========================================================================
   4페이지 - 항로 복원실 (RouteRestoreScene)
   해도(액자 지도) 위 부표를 순서대로 탭해 항로 선을 직접 긋는다(routeDraw).
   완성 후 자료 해석 퀴즈 5문항. 풀패널 없이 좌 해도 / 우 좁은 문제 패널.
   ========================================================================= */
import { el } from "../core/dom.js";
import { buildScene, placeAsset, quiz, pos, toast, speech } from "../components/ui.js";
import { missionFrame, hintFold, nextCoachButton, completeMission } from "./_shared.js";
import { routeDraw } from "../components/interactions.js";
import { DOKDO, BACKGROUNDS } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { ROUTE_QUESTIONS, ROUTE_PATH } from "../data/questions.js";

const WRONG_HINTS = [
  "항해는 출발지부터예요. 배가 떠나는 섬(울릉도)을 먼저 눌러요.",
  "출발 다음은 방향! 해 뜨는 동쪽 바닷길로 나아가요.",
  "이동하다 보면 두 봉우리(동도·서도)가 먼저 보여요.",
  "마지막은 도착지 — 독도예요!",
];

export default function RouteRestoreScene(ctx) {
  const cfg = PAGES.route;
  const { root, layer } = buildScene({ bg: cfg.bg, veil: "soft" });
  const totalSteps = ROUTE_QUESTIONS.length + 1;
  let qi = 0;
  let routeDone = false;

  const frame = missionFrame(ctx, layer, cfg, {
    signSrc: DOKDO.signRoute,
    helpText: "해도의 부표를 항해 순서대로 눌러 항로 선을 이어요. 항로가 완성되면 자료 해석 문제가 열려요.",
  });

  /* ---- 좌측: 해도 선긋기 보드 ---- */
  const chart = routeDraw({
    bgSrc: BACKGROUNDS.routeChart,
    boatSrc: DOKDO.boat,
    nodes: ROUTE_PATH.nodes.map((n) => ({ id: n.id, label: n.label, x: n.x, y: n.y })),
    order: ROUTE_PATH.answer,
    width: 690, height: 448,
    onWrong: (expectedIdx) => toast(ctx.stage, "💡 " + WRONG_HINTS[Math.min(expectedIdx, WRONG_HINTS.length - 1)]),
    onComplete: onRouteComplete,
  });
  chart.node.style.position = "absolute";
  chart.node.style.left = "30px";
  chart.node.style.top = "128px";
  chart.node.style.zIndex = "6";
  layer.appendChild(chart.node);

  /* 단서 칩 (해도 아래) */
  const H = Object.fromEntries(ROUTE_PATH.nodes.map((n) => [n.id, n.hint]));
  layer.appendChild(el("div.row", { style: { ...pos(30, 588, 690), gap: "8px", justifyContent: "center", flexWrap: "wrap", zIndex: 6 } },
    [
      ["🧭 방향", `${H.n1}에서 해 뜨는 쪽으로`],
      ["📏 거리", "약 87.4km 바닷길"],
      ["⛰️ 지형", `${H.n3} 두 봉우리`],
    ].map(([tag, txt]) => el("div", {
      style: { background: "rgba(253,246,227,.92)", border: "1px solid rgba(160,120,50,.4)", borderRadius: "999px", padding: "6px 14px", fontSize: "13px", fontWeight: "800", color: "var(--ink)", whiteSpace: "nowrap" },
      html: `<b style="color:var(--sea-deep)">${tag}</b> · ${txt}`,
    }))));

  /* ---- 캐릭터 ---- */
  placeAsset(layer, DOKDO.boyScout, { x: 1062, y: 452, w: 200, h: 262, alt: "탐험가 소년", z: 3, shadow: true });

  /* ---- 우측: 문제 패널 (좁게) ---- */
  const board = el("div.q-board", { style: { ...pos(748, 100, 512, 574) } }, [el("div.q-board__clip")]);
  const qTitle = el("div.q-board__title", { style: { fontSize: "15.5px", lineHeight: "1.45" } });
  const workArea = el("div", { style: { flex: "1", minHeight: "0", overflowY: "auto", position: "relative", paddingRight: "4px" } });
  board.appendChild(qTitle);
  board.appendChild(workArea);
  layer.appendChild(board);

  const lockPane = el("div.col", {
    style: { alignItems: "center", justifyContent: "center", gap: "8px", height: "100%", textAlign: "center", padding: "10px", color: "var(--ink-soft)" },
  }, [
    el("div", { style: { fontSize: "34px" }, text: "🧭" }),
    el("div", { style: { fontWeight: "900", fontSize: "16px", color: "var(--navy)" }, text: "항로를 먼저 복원해요" }),
    el("div", { style: { fontWeight: "700", fontSize: "13.5px" }, text: "왼쪽 해도의 부표를 순서대로 눌러 선을 이어요" }),
  ]);
  workArea.appendChild(lockPane);
  qTitle.innerHTML = "<b>0단계.</b> " + ROUTE_PATH.prompt;
  frame.setStep(1, totalSteps);

  const hintHolder = el("div");
  layer.appendChild(hintHolder);

  function onRouteComplete() {
    if (routeDone) return;
    routeDone = true;
    workArea.innerHTML = "";
    workArea.appendChild(el("div.col", { style: { alignItems: "center", gap: "10px", padding: "16px 0" } }, [
      el("div.feedback.show.feedback--ok", { text: "⚓ 항로 복원 완료! 이제 자료 해석 문제에 도전해요." }),
      nextCoachButton("문제 풀기 시작", () => renderQuiz(), { icon: "📜" }),
    ]));
  }

  function renderQuiz() {
    const q = ROUTE_QUESTIONS[qi];
    frame.setStep(qi + 2, totalSteps);
    qTitle.innerHTML = `<b>문제 ${qi + 1}.</b> ` + q.prompt;
    workArea.innerHTML = "";
    const nextHolder = el("div.row", { style: { justifyContent: "flex-end", minHeight: "0" } });
    const qc = quiz(q, { onResult: (ok) => {
      if (!ok) return;
      if (qi < ROUTE_QUESTIONS.length - 1) {
        nextHolder.appendChild(nextCoachButton("다음 문제", () => { qi++; renderQuiz(); }));
      } else {
        nextHolder.appendChild(nextCoachButton("미션 완료!", () =>
          completeMission(ctx, "route", { evidence: "c-loc", message: "독도는 울릉도 동쪽 87.4km, 우리 생활권의 섬임을 확인했어요." }), { icon: "🏅" }));
      }
    } });
    workArea.appendChild(qc.node);
    workArea.appendChild(nextHolder);
    hintHolder.innerHTML = "";
    hintHolder.appendChild(hintFold(q.clue || "단서 칩을 다시 읽어 봐요", { x: 30, y: 644 }));
  }

  return root;
}
