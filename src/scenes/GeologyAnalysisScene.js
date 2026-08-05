/* =========================================================================
   5페이지 - 바위섬 분석실 (GeologyAnalysisScene)
   좌측 관찰 자료(이미지)에서 지형 단서 라벨 4개를 눌러 수집(게이팅)
   → 단서 4개 완성 시 우측 문제 보드 잠금 해제 → 자료 해석 퀴즈 3문항.
   (2026-07 옛 앱 복구본에서 3D 지형 탐사를 제외하고 이식 — 3D는 이후 단계)
   ========================================================================= */
import { el, assetImg } from "../core/dom.js";
import { buildScene, placeAsset, quiz, pos, collapsible, modal, button, toast, coachify, uncoach } from "../components/ui.js";
import AudioManager from "../managers/AudioManager.js";
import { missionFrame, nextCoachButton, completeMission } from "./_shared.js";
import { ICONS, DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { GEOLOGY_QUESTIONS, GEOLOGY_COMPARE } from "../data/questions.js";

/* 지형 단서 4종 — fx/fy 는 관찰 이미지 위 라벨 위치(%) */
const GEOLOGY_CLUES = [
  { id: "cliff", icon: "⛰️", title: "가파른 절벽", short: "가파른 절벽", fx: 20, fy: 28,
    desc: ["섬의 옆면이 거의 수직으로 깎여 있어요.", "화산 바위가 굳은 뒤 파도에 깎여 만들어진 모습이에요."] },
  { id: "flat", icon: "🏕️", title: "좁은 평지", short: "좁은 평지", fx: 64, fy: 26,
    desc: ["평평한 땅이 아주 조금뿐이에요.", "건물이나 시설을 세울 자리가 넉넉하지 않아요."] },
  { id: "erosion", icon: "🌊", title: "파도의 침식", short: "파도의 침식", fx: 36, fy: 72,
    desc: ["바위 아랫부분이 파도에 깎여 움푹 들어갔어요.", "센 파도가 오랜 시간에 걸쳐 바위를 조금씩 깎아 냈어요."] },
  { id: "bird", icon: "🪶", title: "바닷새 서식 바위", short: "바닷새 바위", fx: 82, fy: 56,
    desc: ["작은 부속 바위는 바닷새들의 쉼터예요.", "괭이갈매기 같은 새들이 바위 틈에 둥지를 틀어요."] },
];

export default function GeologyAnalysisScene(ctx) {
  const cfg = PAGES.geology;
  const { root, layer } = buildScene({ bg: cfg.bg, veil: "soft" });
  let qi = 0;
  const total = GEOLOGY_QUESTIONS.length;
  const collected = new Set();
  const clueTotal = GEOLOGY_CLUES.length;

  const frame = missionFrame(ctx, layer, cfg, {
    signSrc: DOKDO.signGeology,
    helpText: "관찰 자료의 단서 라벨 4개를 모두 누르면 문제 보드가 열려요.",
  });

  /* ---- 좌측: 관찰 영역 ---- */
  const island = el("div", { style: { ...pos(28, 150, 560, 300), zIndex: 4, borderRadius: "18px", overflow: "hidden", border: "3px solid #fff", boxShadow: "var(--shadow)", background: "#bfe0f3" } });
  layer.appendChild(island);

  const titlePillStyle = { position: "absolute", left: "10px", top: "10px", zIndex: 6, background: "var(--sea)", color: "#fff", fontWeight: "900", fontSize: "14px", padding: "5px 14px", borderRadius: "999px", boxShadow: "var(--shadow-sm)" };
  const clueChip = el("div", { style: { position: "absolute", top: "10px", right: "10px", zIndex: 6, background: "rgba(20,54,92,.92)", color: "#fff", fontWeight: "900", fontSize: "14px", padding: "5px 14px", borderRadius: "999px", boxShadow: "var(--shadow-sm)" }, text: `🔍 단서 0 / ${clueTotal}` });

  const fallbackChips = new Map();
  const islandImg = assetImg(ICONS.dioramaIsland, "독도 바위섬");
  islandImg.style.cssText = "width:100%;height:100%;object-fit:contain;padding:8px";
  island.appendChild(islandImg);
  island.appendChild(el("div", { style: titlePillStyle, text: "🔍 관찰 자료" }));
  GEOLOGY_CLUES.forEach((c) => {
    const chip = el("button", {
      type: "button",
      style: { position: "absolute", left: c.fx + "%", top: c.fy + "%", transform: "translate(-50%,-50%)", zIndex: 5,
        background: "rgba(20,54,92,.92)", color: "#fff", fontWeight: "800", fontSize: "15px", padding: "12px 18px",
        minHeight: "48px", border: "0", fontFamily: "inherit",
        borderRadius: "999px", boxShadow: "var(--shadow-sm)", whiteSpace: "nowrap", cursor: "pointer" },
      text: "🔍 " + c.short,
      onClick: () => { AudioManager.unlock(); AudioManager.click(); openClue(c); },
    });
    coachify(chip, { label: null });
    fallbackChips.set(c.id, chip);
    island.appendChild(chip);
  });
  island.appendChild(clueChip);

  /* ---- 좌하단: 분석 정리 노트(토글, 기본 접힘) ---- */
  layer.appendChild(collapsible({
    title: "분석 정리 노트", icon: "📔",
    style: { ...pos(28, 470), zIndex: 9, maxWidth: "560px" },
    body: [(() => {
      const t = el("table.cmp-table");
      t.appendChild(el("tr", {}, GEOLOGY_COMPARE.headers.map((h) => el("th", { text: h }))));
      t.appendChild(el("tr", {}, GEOLOGY_COMPARE.row.map((c) => el("td", { text: c }))));
      return t;
    })()],
  }));

  /* ---- 캐릭터 ---- */
  placeAsset(layer, DOKDO.robotCrab, { x: 440, y: 540, w: 150, h: 165, alt: "분석 로봇", float: true, z: 3 });
  placeAsset(layer, DOKDO.girlScout, { x: 30, y: 528, w: 170, h: 190, alt: "탐험가 소녀", z: 3 });

  /* ---- 우측: 문제 보드 + 단서 게이팅 잠금 오버레이 ---- */
  const board = el("div.q-board", { style: { ...pos(620, 128, 640, 545) } }, [el("div.q-board__clip")]);
  const badgeRow = el("div.row", { style: { justifyContent: "center", gap: "8px" } });
  const qTitle = el("div.q-board__title");
  const qHolder = el("div", { style: { flex: "1", overflowY: "auto", paddingRight: "4px" } });
  const nextHolder = el("div.row", { style: { justifyContent: "flex-end", minHeight: "0" } });
  board.appendChild(badgeRow); board.appendChild(qTitle); board.appendChild(qHolder); board.appendChild(nextHolder);

  const lockOverlay = el("div", { style: { position: "absolute", inset: "0", zIndex: 40, borderRadius: "inherit",
    background: "rgba(21,38,60,.62)", backdropFilter: "blur(3px)", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: "10px", textAlign: "center", color: "#fff",
    transition: "opacity .3s", padding: "20px" } }, [
    el("div", { style: { fontSize: "46px" }, text: "🔒" }),
    el("div", { style: { fontWeight: "900", fontSize: "20px" }, text: "지형 단서 4개를 먼저 수집해요" }),
    el("div", { style: { fontWeight: "700", fontSize: "14px", opacity: ".9", lineHeight: "1.5" },
      text: "왼쪽 관찰 자료의 단서 라벨을 눌러 단서를 모아요" }),
  ]);
  board.appendChild(lockOverlay);
  layer.appendChild(board);

  /* ---- 단서 수집 로직 ---- */
  function updateClueChip() {
    const done = collected.size >= clueTotal;
    clueChip.textContent = `${done ? "✅" : "🔍"} 단서 ${collected.size} / ${clueTotal}`;
    if (done) clueChip.style.background = "rgba(47,158,68,.95)";
  }

  function markCollectedVisual(id) {
    const chip = fallbackChips.get(id);
    if (chip) {
      uncoach(chip);
      chip.style.background = "rgba(47,158,68,.94)";
      const clue = GEOLOGY_CLUES.find((c) => c.id === id);
      chip.textContent = "✅ " + (clue ? clue.short : "");
    }
  }

  /* 단서 카드 팝업 — 수집 전이면 '단서 획득!' 버튼으로 수집 */
  function openClue(clue) {
    const done = collected.has(clue.id);
    const body = el("div.col", { style: { gap: "10px", alignItems: "center", textAlign: "center" } }, [
      el("div", { style: { fontSize: "44px" }, text: clue.icon }),
      el("div", { style: { fontWeight: "900", fontSize: "20px", color: "var(--navy)" }, text: clue.title }),
      el("div", { style: { fontSize: "15px", fontWeight: "700", color: "var(--ink-soft)", lineHeight: "1.55" }, html: clue.desc.join("<br>") }),
    ]);
    const md = modal(ctx.stage, { title: "지형 단서 카드", icon: "🔍", body, buttons: [
      done
        ? button("확인", { variant: "ghost", onClick: () => md.close() })
        : button("단서 획득!", { variant: "gold", icon: "✨", onClick: () => { md.close(); collectClue(clue); } }),
    ] });
  }

  function collectClue(clue) {
    if (collected.has(clue.id)) return;
    collected.add(clue.id);
    markCollectedVisual(clue.id);
    updateClueChip();
    if (collected.size >= clueTotal) unlockBoard();
    else toast(ctx.stage, `단서를 모았어요! (${collected.size} / ${clueTotal})`);
  }

  /* 단서 4개 완성 → 잠금 해제 + 문제 보드 코치 강조 */
  function unlockBoard() {
    AudioManager.correct();
    toast(ctx.stage, "단서 4개 완성! 문제 보드가 열렸어요");
    lockOverlay.style.opacity = "0";
    setTimeout(() => lockOverlay.remove(), 320);
    coachify(board, { label: null });
    board.addEventListener("pointerdown", () => uncoach(board), { once: true });
  }

  /* ---- 문제 진행 ---- */
  function render() {
    const q = GEOLOGY_QUESTIONS[qi];
    const isMulti = q.type === "multiple_choice";
    frame.setStep(qi + 1, total, "문제");
    badgeRow.innerHTML = "";
    badgeRow.appendChild(el("span", { style: { background: "linear-gradient(180deg,var(--sea),var(--sea-deep))", color: "#fff", fontWeight: "900", fontSize: "14px", padding: "5px 16px", borderRadius: "999px" }, text: `문제 ${qi + 1} / ${total}` }));
    if (isMulti) badgeRow.appendChild(el("span", { style: { background: "var(--gold)", color: "#5c3c05", fontWeight: "800", fontSize: "13px", padding: "5px 12px", borderRadius: "999px" }, text: `정답 ${q.answer.length}개` }));

    qTitle.innerHTML = q.prompt;
    qHolder.innerHTML = "";
    nextHolder.innerHTML = "";
    const qc = quiz(q, { confirmLabel: "정답 확인", confirmAlign: "center", onResult: (ok) => {
      if (!ok) return;
      if (qi < total - 1) {
        nextHolder.appendChild(nextCoachButton("다음 문제", () => { qi++; render(); }));
      } else {
        nextHolder.appendChild(nextCoachButton("미션 완료!", () =>
          completeMission(ctx, "geology", { evidence: "c-geo", message: "독도는 가파른 바위 지형이 많아 평지가 제한적임을 분석했어요." }), { icon: "🏅" }));
      }
    } });
    qHolder.appendChild(qc.node);
  }
  render();
  return root;
}
