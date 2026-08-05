/* =========================================================================
   7페이지 - 생태 수호 작전 (EcologyProtectionScene)
   관찰 구역 3곳(바다새·해안 식물·조간대)을 눌러 생태 단서 수집(게이팅)
   → 상황 판단 문제 3개: 행동 선택 → 정답 시 '영향 예측' 카드 표시.
   ========================================================================= */
import { el } from "../core/dom.js";
import { buildScene, placeAsset, quiz, pos, modal, button, toast, coachify, uncoach } from "../components/ui.js";
import { missionFrame, hintFold, nextCoachButton, completeMission } from "./_shared.js";
import { DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { ECOLOGY_CLUES, ECOLOGY_QUESTIONS } from "../data/questions.js";
import AudioManager from "../managers/AudioManager.js";

const ZONE_STYLE = [
  { x: 40, y: 150 },
  { x: 40, y: 300 },
  { x: 40, y: 450 },
];

export default function EcologyProtectionScene(ctx) {
  const cfg = PAGES.ecology;
  const { root, layer } = buildScene({ bg: cfg.bg, veil: "soft" });
  let qi = 0;
  const collected = new Set();
  const clueTotal = ECOLOGY_CLUES.length;
  const total = ECOLOGY_QUESTIONS.length;

  const frame = missionFrame(ctx, layer, cfg, {
    signSrc: DOKDO.signEcology,
    helpText: "관찰 구역 3곳의 생태 단서를 모으면 상황 판단 문제가 열려요. 행동을 고르면 그 행동이 자연에 주는 영향까지 확인해요.",
  });

  /* ---- 좌측: 관찰 구역 카드 3개 ---- */
  const zoneCards = new Map();
  ECOLOGY_CLUES.forEach((c, i) => {
    const card = el("div", {
      style: {
        ...pos(ZONE_STYLE[i].x, ZONE_STYLE[i].y, 250, 120), zIndex: 6,
        background: "rgba(255,255,255,.94)", border: "3px solid var(--green)",
        borderRadius: "16px", boxShadow: "var(--shadow)", cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "4px",
        padding: "10px",
      },
    }, [
      el("div", { style: { fontSize: "32px" }, text: c.icon }),
      el("div", { style: { fontSize: "15.5px", fontWeight: "900", color: "var(--green-deep)" }, text: c.title }),
      el("div.pill", { style: { background: "var(--green)", fontSize: "12px" }, text: "🔍 관찰하기" }),
    ]);
    coachify(card, { label: null });
    card.addEventListener("click", () => { AudioManager.unlock(); AudioManager.click(); openClue(c, card); });
    zoneCards.set(c.id, card);
    layer.appendChild(card);
  });

  const clueChip = el("div.hud-chip", { style: { position: "absolute", left: "40px", top: "100px", zIndex: 9 }, text: `🔍 생태 단서 0 / ${clueTotal}` });
  layer.appendChild(clueChip);

  /* ---- 캐릭터 ---- */
  placeAsset(layer, DOKDO.rangerBoy, { x: 330, y: 470, w: 190, h: 240, alt: "생태 수호 대원", z: 3 });
  placeAsset(layer, DOKDO.lighthouseChar, { x: 1100, y: 470, w: 160, h: 240, alt: "등대 마스코트", float: true, z: 3 });

  /* ---- 우측: 문제 보드 + 잠금 ---- */
  const board = el("div.q-board", { style: { ...pos(560, 108, 700, 566) } }, [el("div.q-board__clip")]);
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
    el("div", { style: { fontWeight: "900", fontSize: "20px" }, text: "생태 단서 3개를 먼저 관찰해요" }),
    el("div", { style: { fontWeight: "700", fontSize: "14px", opacity: ".9" }, text: "왼쪽 관찰 구역 카드를 눌러 단서를 모아요" }),
  ]);
  board.appendChild(lockOverlay);
  layer.appendChild(board);

  const hintHolder = el("div");
  layer.appendChild(hintHolder);

  /* ---- 단서 수집 ---- */
  function openClue(c, card) {
    const done = collected.has(c.id);
    const body = el("div.col", { style: { gap: "10px", alignItems: "center", textAlign: "center" } }, [
      el("div", { style: { fontSize: "44px" }, text: c.icon }),
      el("div", { style: { fontWeight: "900", fontSize: "20px", color: "var(--green-deep)" }, text: c.title }),
      el("div", { style: { fontSize: "15px", fontWeight: "700", color: "var(--ink-soft)", lineHeight: "1.6", wordBreak: "keep-all" }, html: c.desc.join("<br>") }),
      el("div.src-tag", { text: "📎 외교부 독도: 자연환경" }),
    ]);
    const md = modal(ctx.stage, { title: "생태 단서 카드", icon: "🌿", body, buttons: [
      done
        ? button("확인", { variant: "ghost", onClick: () => md.close() })
        : button("단서 획득!", { variant: "gold", icon: "✨", onClick: () => {
            md.close();
            collected.add(c.id);
            uncoach(card);
            card.style.borderStyle = "solid";
            card.querySelector(".pill").textContent = "✅ 관찰 완료";
            clueChip.textContent = `${collected.size >= clueTotal ? "✅" : "🔍"} 생태 단서 ${collected.size} / ${clueTotal}`;
            if (collected.size >= clueTotal) unlockBoard();
            else toast(ctx.stage, `단서를 모았어요! (${collected.size} / ${clueTotal})`);
          } }),
    ] });
  }

  function unlockBoard() {
    AudioManager.correct();
    toast(ctx.stage, "관찰 완료! 상황 판단 작전을 시작해요");
    lockOverlay.style.opacity = "0";
    setTimeout(() => lockOverlay.remove(), 320);
    coachify(board, { label: null });
    board.addEventListener("pointerdown", () => uncoach(board), { once: true });
  }

  /* ---- 상황 판단 문제 ---- */
  function render() {
    const q = ECOLOGY_QUESTIONS[qi];
    frame.setStep(qi + 1, total, "상황");
    badgeRow.innerHTML = "";
    badgeRow.appendChild(el("span.pill.pill--sea", { text: `상황 ${qi + 1} / ${total}` }));
    qTitle.innerHTML = q.prompt;
    qHolder.innerHTML = "";
    nextHolder.innerHTML = "";

    const effectCard = el("div", { style: { display: "none", background: "#e9f8ec", border: "2px solid var(--green)", borderRadius: "12px", padding: "10px 14px", fontSize: "14.5px", fontWeight: "800", color: "var(--green-deep)", lineHeight: "1.5", wordBreak: "keep-all" } });

    const qc = quiz(q, { onResult: (ok) => {
      if (!ok) return;
      effectCard.style.display = "block";
      effectCard.innerHTML = "🌱 <b>영향 예측</b> · " + q.effect;
      if (qi < total - 1) {
        nextHolder.appendChild(nextCoachButton("다음 상황", () => { qi++; render(); }));
      } else {
        nextHolder.appendChild(nextCoachButton("미션 완료!", () =>
          completeMission(ctx, "ecology", {
            evidence: ["c-eco", "c-pro"],
            message: "생태 단서를 근거로 알맞은 보호 행동을 판단했어요. 보호 근거 카드까지 2장 획득!",
          }), { icon: "🏅" }));
      }
    } });
    qHolder.appendChild(qc.node);
    qHolder.appendChild(effectCard);

    hintHolder.innerHTML = "";
    hintHolder.appendChild(hintFold(q.hint, { x: 40, y: 640 }));
  }
  render();
  return root;
}
