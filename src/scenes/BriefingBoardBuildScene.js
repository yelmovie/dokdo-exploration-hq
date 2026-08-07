/* =========================================================================
   8페이지 - 브리핑 보드 제작 (BriefingBoardBuildScene)
   미션에서 모은 근거 카드 + 근거가 약한 카드가 섞인 보관함에서
   카드를 골라 5개 영역(위치·지형·역사·생태·보호)에 드래그/탭 배치.
   - 약한 카드를 넣으면 '근거 부족' 경고와 까닭 표시(교육 포인트)
   - 다른 영역 카드를 넣으면 되돌리기
   - 5칸 완성 → 사실 확인 문제 → 미션 완료
   ========================================================================= */
import { el } from "../core/dom.js";
import { buildScene, placeAsset, quiz, pos, modal, button, toast, pressable, collapsible, speech } from "../components/ui.js";
import { makeDraggable } from "../components/interactions.js";
import { missionFrame, nextCoachButton, completeMission } from "./_shared.js";
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

  /* 수집한 근거 카드 + 약한 카드 1장만 섞기 (6장 균형 배치) */
  const owned = new Set(save.get("evidenceCards"));
  const weakCards = BRIEFING_CARDS.filter((c) => !c.strong);
  const weakPick = weakCards[Math.floor(Math.random() * weakCards.length)];
  const pool = BRIEFING_CARDS.filter((c) => (c.strong ? owned.has(c.id) : c === weakPick))
    .sort(() => Math.random() - 0.5);
  const placedNow = { ...save.get("briefingBoard") }; // field -> cardId (이어하기 복원)
  let selectedCard = null;

  /* ---- 드롭존: 배경 그림의 코르크보드 메모 위에 직접 (판때기 없음) ----
     좌표는 bg_board.jpg 에 그려진 5개 메모지 실측값 */
  const ZONE_RECT = {
    location:   { x: 314, y: 172, w: 162, h: 136 },  // '독도 기본 정보' 메모
    geology:    { x: 716, y: 176, w: 152, h: 140 },  // '지리적 특징' 메모
    history:    { x: 502, y: 198, w: 196, h: 164 },  // '역사적 사실' 메모
    ecology:    { x: 312, y: 324, w: 158, h: 150 },  // '독도의 생태' 메모
    protection: { x: 714, y: 328, w: 166, h: 134 },  // '우리의 다짐' 메모
  };
  const zones = new Map();
  BRIEFING_FIELDS.forEach((f) => {
    const r = ZONE_RECT[f.key];
    const z = el("div.board-zone", {
      style: {
        ...pos(r.x, r.y, r.w, r.h), zIndex: 6,
        border: "2.5px dashed rgba(201,150,42,.85)", borderRadius: "12px",
        background: "rgba(255,255,255,.06)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: "6px", cursor: "pointer",
        transition: "background .15s, border-color .15s",
      },
    }, [
      el("span", { style: { fontSize: "12px", fontWeight: "900", color: "#fff", background: f.color, padding: "1px 10px", borderRadius: "999px", boxShadow: "var(--shadow-sm)", pointerEvents: "none" }, text: `${f.icon} ${f.label} 근거 놓기` }),
    ]);
    z.dataset.field = f.key;
    pressable(z);
    z.addEventListener("click", () => {
      if (selectedCard) { AudioManager.unlock(); tryPlace(selectedCard, f.key); }
    });
    zones.set(f.key, z);
    layer.appendChild(z);
  });

  /* ---- 하단 책상: 카드 보관함 (책상 위에 놓인 카드들) ---- */
  const tray = el("div", { style: { ...pos(170, 496, 520, 216), zIndex: 7 } });
  tray.appendChild(el("div.pill", { style: { background: "var(--navy)", fontFamily: "var(--font-display)", marginBottom: "6px" }, text: "🗂 근거 카드 — 알맞은 메모지에 붙여요" }));
  const trayBody = el("div.row", { style: { gap: "8px", flexWrap: "wrap", alignItems: "flex-start" } });
  tray.appendChild(trayBody);
  layer.appendChild(tray);

  /* ---- 우측: 검토 기준 (수납) ---- */
  layer.appendChild(collapsible({
    title: "검토 기준", icon: "🔎",
    style: { ...pos(986, 96, 276), zIndex: 9 },
    body: [el("div.col", { style: { gap: "7px" } },
      [["✔️", "사실성", "확인할 수 있는 내용인가?"], ["📎", "근거성", "출처 있는 자료인가?"], ["⚖️", "균형", "5개 영역이 고루 있는가?"], ["🗣️", "표현", "설명하는 문장인가?"]].map(([i, t, d]) =>
        el("div", {}, [
          el("div", { style: { fontSize: "13.5px", fontWeight: "900", color: "var(--ink)" }, text: `${i} ${t}` }),
          el("div", { style: { fontSize: "12.5px", fontWeight: "600", color: "var(--ink-soft)", wordBreak: "keep-all" }, text: d }),
        ])))],
  }));

  placeAsset(layer, DOKDO.seagullMail, { x: 862, y: 492, w: 170, h: 200, alt: "갈매기 집배원", float: true, z: 3, shadow: true });
  // 힌트를 갈매기 말풍선(타이핑)으로 안내 — 별도 힌트 버튼 없음
  speech(layer, { x: 788, y: 380, text: "카드의 문장에 ‘확인할 수 있는 사실’이 있는지 봐요. 느낌·상상만 있는 카드는 근거가 약해요.", tail: "right", width: 240 });

  const progChip = el("div.hud-chip", { style: { position: "absolute", left: "24px", top: "96px", zIndex: 12 } });
  layer.appendChild(progChip);


  /* ---- 카드 렌더링 ---- */
  function cardNode(card) {
    const isWeak = !card.strong;
    const c = el("div.order__card", {
      style: { flexDirection: "column", gap: "3px", padding: "7px 9px", borderColor: "#b9c7d6", width: "158px", minHeight: "0" },
    }, [
      el("div", { style: { fontSize: "12.5px", fontWeight: "800", lineHeight: "1.35", whiteSpace: "pre-line" }, text: card.label }),
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
      z.style.background = "rgba(255,255,255,.4)";
      const n = el("div.zone-card", {
        style: {
          background: "#fff", border: "2px solid #c9962a", borderRadius: "10px",
          padding: "6px 8px", fontSize: "11.5px", fontWeight: "800", color: "var(--ink)",
          lineHeight: "1.35", whiteSpace: "pre-line", cursor: "pointer", width: "100%",
          boxShadow: "2px 3px 8px rgba(90,64,20,.3)", transform: "rotate(-1.5deg)",
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
