/* =========================================================================
   8페이지 - 브리핑 보드 제작 (BriefingBoardBuildScene)
   미션에서 모은 근거 카드 + 근거가 약한 카드가 섞인 보관함에서
   카드를 골라 5개 영역(위치·지형·역사·생태·보호)에 드래그/탭 배치.
   - 약한 카드를 넣으면 '근거 부족' 경고와 까닭 표시(교육 포인트)
   - 다른 영역 카드를 넣으면 되돌리기
   - 5칸 완성 → 사실 확인 문제 → 미션 완료
   ========================================================================= */
import { el } from "../core/dom.js";
import { buildScene, placeAsset, quiz, pos, modal, button, toast, pressable } from "../components/ui.js";
import { makeDraggable } from "../components/interactions.js";
import { missionFrame, hintFold, nextCoachButton, completeMission } from "./_shared.js";
import { DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { BRIEFING_FIELDS } from "../data/missions.js";
import { BRIEFING_CARDS, BOARD_CHECK_QUESTION } from "../data/questions.js";
import AudioManager from "../managers/AudioManager.js";
import stats from "../managers/StatsManager.js";

export default function BriefingBoardBuildScene(ctx) {
  const cfg = PAGES.briefingBoard;
  const { root, layer } = buildScene({ bg: cfg.bg, veil: "soft" });
  const save = ctx.save;

  const frame = missionFrame(ctx, layer, cfg, {
    signSrc: DOKDO.signBriefing,
    helpText: "보관함의 카드를 알맞은 영역에 끌어다 놓아요(눌러도 돼요). 근거가 약한 카드는 보드에 올리면 안 돼요!",
  });
  frame.setStep(1, 2, "활동");

  /* 수집한 근거 카드 + 약한 카드 3장 섞기 */
  const owned = new Set(save.get("evidenceCards"));
  const pool = BRIEFING_CARDS.filter((c) => (c.strong ? owned.has(c.id) : true))
    .sort(() => Math.random() - 0.5);
  const placedNow = { ...save.get("briefingBoard") }; // field -> cardId (이어하기 복원)
  let selectedCard = null;

  /* ---- 좌측: 카드 보관함 ---- */
  const tray = el("div", {
    style: {
      ...pos(24, 108, 300, 560), zIndex: 6, background: "rgba(255,255,255,.94)",
      border: "2px solid var(--panel-line)", borderRadius: "18px", boxShadow: "var(--shadow)",
      display: "flex", flexDirection: "column", gap: "8px", padding: "14px", overflowY: "auto",
    },
  });
  tray.appendChild(el("div", { style: { fontSize: "16px", fontWeight: "900", color: "var(--navy)", textAlign: "center" }, text: "🗂️ 근거 카드 보관함" }));
  const trayBody = el("div.col", { style: { gap: "8px" } });
  tray.appendChild(trayBody);
  layer.appendChild(tray);

  /* ---- 중앙: 브리핑 보드 5칸 ---- */
  const boardPanel = el("div", {
    style: {
      ...pos(350, 108, 640, 560), zIndex: 6,
      background: "linear-gradient(160deg,#d9a05b 0%,#c8904e 100%)",
      border: "6px solid #8a5a2b", borderRadius: "20px", boxShadow: "var(--shadow)",
      display: "flex", flexDirection: "column", gap: "8px", padding: "16px",
    },
  });
  boardPanel.appendChild(el("div", {
    style: { textAlign: "center", fontSize: "19px", fontWeight: "900", color: "#fff", textShadow: "0 1px 3px rgba(0,0,0,.4)" },
    text: "📌 독도 브리핑 보드 — 근거로 설명해요",
  }));
  const zoneWrap = el("div", { style: { flex: "1", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridAutoRows: "1fr", gap: "10px" } });
  boardPanel.appendChild(zoneWrap);
  layer.appendChild(boardPanel);

  const zones = new Map();
  BRIEFING_FIELDS.forEach((f) => {
    const z = el("div.board-zone", {
      style: {
        border: "2px dashed #c9962a", borderRadius: "14px", background: "rgba(255,252,243,.9)",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
        gap: "4px", padding: "8px", cursor: "pointer", minHeight: "0", overflow: "hidden",
      },
    }, [
      el("div.row", { style: { alignItems: "center", gap: "6px", flex: "0 0 auto" } }, [
        el("span", { style: { width: "10px", height: "10px", borderRadius: "50%", background: f.color, display: "inline-block" } }),
        el("span", { style: { fontSize: "15px", fontWeight: "900", color: "var(--navy)" }, text: `${f.icon} ${f.label}` }),
      ]),
    ]);
    z.dataset.field = f.key;
    pressable(z);
    z.addEventListener("click", () => {
      if (selectedCard) { AudioManager.unlock(); tryPlace(selectedCard, f.key); }
    });
    zones.set(f.key, z);
    zoneWrap.appendChild(z);
  });

  /* ---- 우측: 검토 기준 ---- */
  layer.appendChild(el("div.panel", {
    style: { ...pos(1010, 108, 250), zIndex: 6, padding: "14px", display: "flex", flexDirection: "column", gap: "8px" },
  }, [
    el("div", { style: { fontSize: "15px", fontWeight: "900", color: "var(--navy)" }, text: "🔎 검토 기준" }),
    ...[["✔️", "사실성", "확인할 수 있는 내용인가?"], ["📎", "근거성", "출처 있는 자료인가?"], ["⚖️", "균형", "5개 영역이 고루 있는가?"], ["🗣️", "표현", "설명하는 문장인가?"]].map(([i, t, d]) =>
      el("div", {}, [
        el("div", { style: { fontSize: "13.5px", fontWeight: "900", color: "var(--ink)" }, text: `${i} ${t}` }),
        el("div", { style: { fontSize: "12.5px", fontWeight: "600", color: "var(--ink-soft)", wordBreak: "keep-all" }, text: d }),
      ])),
  ]));

  placeAsset(layer, DOKDO.seagullMail, { x: 1050, y: 470, w: 190, h: 220, alt: "갈매기 집배원", float: true, z: 3 });

  const progChip = el("div.hud-chip", { style: { position: "absolute", right: "150px", top: "72px", zIndex: 12 } });
  layer.appendChild(progChip);

  const hintHolder = el("div");
  layer.appendChild(hintHolder);
  hintHolder.appendChild(hintFold("카드의 문장에 ‘확인할 수 있는 사실’이 있는지 봐요. 느낌·상상만 있는 카드는 근거가 약해요.", { x: 24, y: 660 }));

  /* ---- 카드 렌더링 ---- */
  function cardNode(card) {
    const isWeak = !card.strong;
    const c = el("div.order__card", {
      style: { flexDirection: "column", gap: "3px", padding: "9px 10px", borderColor: "#b9c7d6", width: "100%" },
    }, [
      el("div", { style: { fontSize: "13.5px", fontWeight: "800", lineHeight: "1.4", whiteSpace: "pre-line" }, text: card.label }),
      card.strong
        ? el("div", { style: { fontSize: "11px", fontWeight: "700", color: "var(--sea-deep)", background: "#eaf4fd", borderRadius: "999px", padding: "1px 8px" }, text: "📎 " + card.source })
        : el("div", { style: { fontSize: "11px", fontWeight: "700", color: "#6b5310", background: "#fff3cd", borderRadius: "999px", padding: "1px 8px" }, text: "출처 없음" }),
    ]);
    makeDraggable(c, {
      dropSelector: ".board-zone",
      onTap: () => {
        selectedCard = selectedCard === card ? null : card;
        paintTray();
        if (selectedCard) toast(ctx.stage, "카드를 들었어요! 놓을 영역을 눌러요.");
      },
      onDrop: (zone) => { if (zone) tryPlace(card, zone.dataset.field); },
    });
    c.dataset.cardId = card.id;
    if (selectedCard === card) { c.style.borderColor = "var(--gold-deep)"; c.style.background = "#fff6da"; }
    return c;
  }

  function paintTray() {
    trayBody.innerHTML = "";
    const placedIds = new Set(Object.values(placedNow).filter(Boolean));
    pool.forEach((card) => { if (!placedIds.has(card.id)) trayBody.appendChild(cardNode(card)); });
  }

  function paintZones() {
    BRIEFING_FIELDS.forEach((f) => {
      const z = zones.get(f.key);
      z.querySelectorAll(".zone-card").forEach((n) => n.remove());
      const cid = placedNow[f.key];
      if (!cid) { z.style.borderStyle = "dashed"; return; }
      const card = BRIEFING_CARDS.find((c) => c.id === cid);
      if (!card) return;
      z.style.borderStyle = "solid";
      const n = el("div.zone-card", {
        style: {
          background: "#fff", border: "2px solid #c9962a", borderRadius: "10px",
          padding: "6px 8px", fontSize: "12px", fontWeight: "800", color: "var(--ink)",
          lineHeight: "1.35", whiteSpace: "pre-line", cursor: "pointer", width: "100%",
        },
        text: card.label,
        onClick: (e) => {
          e.stopPropagation();
          AudioManager.unlock(); AudioManager.click();
          placedNow[f.key] = null;
          save.setBoardField(f.key, null);
          refresh();
          toast(ctx.stage, "카드를 보관함으로 되돌렸어요.");
        },
      });
      z.appendChild(n);
    });
    const done = BRIEFING_FIELDS.filter((f) => placedNow[f.key]).length;
    progChip.textContent = `보드 완성 ${done} / 5`;
  }

  function tryPlace(card, fieldKey) {
    selectedCard = null;
    const f = BRIEFING_FIELDS.find((x) => x.key === fieldKey);
    if (!card.strong) {
      stats.wrong++;
      AudioManager.wrong();
      const md = modal(ctx.stage, {
        title: "근거가 약한 카드예요!", icon: "⚠️",
        bodyHtml: `<div style="font-size:15px;font-weight:800;color:var(--ink);line-height:1.6;word-break:keep-all">「${card.label.replace(/\n/g, " ")}」<br><br>❌ ${card.weakWhy}<br>브리핑 보드에는 <b>출처가 있는 사실 근거</b>만 올릴 수 있어요.</div>`,
        buttons: [button("알겠어요", { variant: "green", onClick: () => md.close() })],
      });
      refresh();
      return;
    }
    if (card.field !== fieldKey) {
      stats.wrong++;
      AudioManager.wrong();
      toast(ctx.stage, `이 카드는 ${f.label} 영역 근거가 아니에요. 내용을 다시 읽어 봐요.`);
      refresh();
      return;
    }
    // 배치 (같은 카드가 다른 칸에 있었으면 이동)
    for (const k of Object.keys(placedNow)) if (placedNow[k] === card.id) placedNow[k] = null;
    placedNow[fieldKey] = card.id;
    save.setBoardField(fieldKey, card.id);
    AudioManager.correct();
    refresh();
    const done = BRIEFING_FIELDS.filter((x) => placedNow[x.key]).length;
    if (done === 5) onBoardComplete();
    else toast(ctx.stage, `좋아요! ${f.label} 근거를 붙였어요. (${done} / 5)`);
  }

  function refresh() { paintTray(); paintZones(); }

  /* ---- 5칸 완성 → 사실 확인 문제 → 완료 ---- */
  function onBoardComplete() {
    frame.setStep(2, 2, "활동");
    const body = el("div.col", { style: { gap: "10px" } });
    const qc = quiz(BOARD_CHECK_QUESTION, { onResult: (ok) => {
      if (!ok) return;
      body.appendChild(el("div.row", { style: { justifyContent: "center", marginTop: "6px" } }, [
        nextCoachButton("브리핑 보드 완성!", () => {
          md.close();
          completeMission(ctx, "briefing", { message: "위치·지형·역사·생태·보호, 다섯 영역의 근거를 균형 있게 모았어요. 이제 발표 준비!" });
        }, { icon: "🏅" }),
      ]));
    } });
    body.appendChild(el("div.tip", { html: "🎉 5개 영역을 모두 채웠어요! 마지막으로 <b>검토 기준</b>을 확인해요." }));
    body.appendChild(el("div", { style: { fontSize: "16px", fontWeight: "900", color: "var(--navy)", lineHeight: "1.5" }, html: BOARD_CHECK_QUESTION.prompt }));
    body.appendChild(qc.node);
    const md = modal(ctx.stage, { title: "제출 전 마지막 검토", icon: "🔎", body, buttons: [] });
  }

  refresh();
  /* 이어하기로 이미 5칸이 차 있으면 바로 검토 단계 */
  if (BRIEFING_FIELDS.every((f) => placedNow[f.key]) && !save.isCompleted("briefing")) {
    setTimeout(onBoardComplete, 400);
  }
  return root;
}
