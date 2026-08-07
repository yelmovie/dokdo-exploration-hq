/* =========================================================================
   5페이지 - 바위섬 분석실 (GeologyAnalysisScene)
   좌측 관찰 자료(이미지)에서 지형 단서 라벨 4개를 눌러 수집(게이팅)
   → 단서 4개 완성 시 우측 문제 보드 잠금 해제 → 자료 해석 퀴즈 3문항.
   (2026-07 옛 앱 복구본에서 3D 지형 탐사를 제외하고 이식 — 3D는 이후 단계)
   ========================================================================= */
import { el, assetImg } from "../core/dom.js";
import { buildScene, placeAsset, quiz, pos, collapsible, modal, button, toast, coachify, uncoach, hudPill, lockOverlay } from "../components/ui.js";
import AudioManager from "../managers/AudioManager.js";
import { missionFrame, nextCoachButton, completeMission, awardDex } from "./_shared.js";
import { DOKDO, PHOTOS } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { GEOLOGY_QUESTIONS, GEOLOGY_COMPARE, GEOLOGY_MATCH } from "../data/questions.js";
import { supportsWebGL } from "../components/three/ThreeStage.js";
import { createDokdoTerrain3D } from "../components/three/DokdoTerrain3D.js";
import { createDokdoGlbDiorama } from "../components/three/DokdoGlbDiorama.js";

/* 단서별 실사 사진 (단서 카드 모달에서 표시) — 외교부 실사 */
const CLUE_PHOTO = { cliff: "seodo", flat: "dongdo", erosion: "elephant", bird: "aerial" };

/* 지형 단서 4종 — fx/fy 는 실사 항공 사진 위 라벨 위치(%) */
const GEOLOGY_CLUES = [
  { id: "cliff", icon: "⛰️", title: "가파른 절벽", short: "가파른 절벽", fx: 30, fy: 30,
    desc: ["섬의 옆면이 거의 수직으로 깎여 있어요.", "화산 바위가 굳은 뒤 파도에 깎여 만들어진 모습이에요."] },
  { id: "flat", icon: "🏕️", title: "좁은 평지", short: "좁은 평지", fx: 72, fy: 22,
    desc: ["평평한 땅이 아주 조금뿐이에요.", "건물이나 시설을 세울 자리가 넉넉하지 않아요."] },
  { id: "erosion", icon: "🌊", title: "파도의 침식", short: "파도의 침식", fx: 22, fy: 62,
    desc: ["바위 아랫부분이 파도에 깎여 움푹 들어갔어요.", "센 파도가 오랜 시간에 걸쳐 바위를 조금씩 깎아 냈어요. 삼형제굴바위도 이렇게 만들어졌어요."] },
  { id: "bird", icon: "🪶", title: "바닷새 서식 바위", short: "바닷새 바위", fx: 76, fy: 72,
    desc: ["작은 부속 바위는 바닷새들의 쉼터예요.", "괭이갈매기 같은 새들이 바위 틈에 둥지를 틀어요."] },
];

export default function GeologyAnalysisScene(ctx) {
  const cfg = PAGES.geology;
  const { root, layer } = buildScene({ bg: cfg.bg, veil: "soft" });
  let qi = 0;
  /* 활동 흐름: 복수정답 → 자료 비교 → 원인-결과 연결 → 화산섬 → 시설 분산 → 모형 이해(메타) */
  const FLOW = [GEOLOGY_QUESTIONS[0], GEOLOGY_QUESTIONS[1], { ...GEOLOGY_MATCH, type: "match" }, ...GEOLOGY_QUESTIONS.slice(2)];
  const total = FLOW.length;
  const collected = new Set();
  const clueTotal = GEOLOGY_CLUES.length;

  const use3D = supportsWebGL();
  const frame = missionFrame(ctx, layer, cfg, {
    signSrc: DOKDO.signGeology,
    helpText: use3D
      ? "3D 독도를 손가락으로 돌려 보며 반짝이는 단서 4개를 모으면 문제 보드가 열려요. ‘단면 보기’로 섬 속 지층도 관찰해요!"
      : "관찰 자료의 단서 라벨 4개를 모두 누르면 문제 보드가 열려요.",
  });

  /* ---- 좌측: 관찰 영역 ---- */
  const island = el("div", { style: { ...pos(28, 150, 560, 300), zIndex: 4, borderRadius: "18px", overflow: "hidden", border: "3px solid #fff", boxShadow: "var(--shadow)", background: "#bfe0f3" } });
  layer.appendChild(island);

  const clueChip = hudPill(`🔍 단서 0 / ${clueTotal}`, { style: { position: "absolute", top: "10px", right: "10px", zIndex: 6 } });

  const fallbackChips = new Map();
  let viewer = null;

  if (use3D) {
    /* ---- 3D 독도 지형 탐사 (회전·확대·단면 보기) ---- */
    island.style.background = "linear-gradient(180deg,#8ecdf2 0%,#c8ecff 62%,#7fb6dd 100%)";
    viewer = createDokdoTerrain3D({ root, width: 560, height: 300, glbSrc: "public/models/dokdo_diorama.glb", onMarkerSelect: (id) => {
      const clue = GEOLOGY_CLUES.find((c) => c.id === id);
      if (!clue) return;
      AudioManager.unlock(); AudioManager.click();
      openClue(clue);
    } });
    Object.assign(viewer.el.style, { width: "100%", height: "100%" });
    island.appendChild(viewer.el);
    island.appendChild(hudPill("🧭 3D 독도 탐험", { variant: "sea", style: { position: "absolute", left: "10px", top: "10px", zIndex: 6 } }));
    island.appendChild(el("div", { style: { position: "absolute", left: "10px", bottom: "8px", zIndex: 6, fontSize: "11.5px", fontWeight: "800", color: "var(--navy)", background: "rgba(255,255,255,.88)", padding: "3px 10px", borderRadius: "999px" }, text: "🖐 드래그 회전 · 두 손가락 확대 · 반짝이는 단서 탭" }));

    /* 단면 보기 토글 — '단순화 단면 모형' 안내 (실제 지질 단면이 아님을 명시) */
    const strataTipStyle = { background: "rgba(20,32,48,.85)", color: "#fff", fontWeight: "800", fontSize: "12px", padding: "4px 10px", borderRadius: "8px", boxShadow: "var(--shadow-sm)" };
    const strataTips = el("div", { style: { position: "absolute", left: "12px", top: "48px", zIndex: 6, display: "none", flexDirection: "column", gap: "5px", maxWidth: "252px" } }, [
      el("div", { style: { ...strataTipStyle, background: "rgba(20,54,92,.94)", fontSize: "12.5px", wordBreak: "keep-all" }, text: "독도 지형을 쉽게 이해하기 위한 단순화 단면 모형이에요." }),
      el("div", { style: strataTipStyle, text: "1. 가파른 바위 절벽" }),
      el("div", { style: strataTipStyle, text: "2. 좁은 평지" }),
      el("div", { style: strataTipStyle, text: "3. 화산 조각이 굳은 암석층" }),
      el("div", { style: strataTipStyle, text: "4. 파도에 깎인 해안 바위" }),
      el("div", { style: { ...strataTipStyle, background: "rgba(255,255,255,.92)", color: "var(--ink-soft)", fontWeight: "700", fontSize: "11.5px", wordBreak: "keep-all", lineHeight: "1.45" },
        text: "실제 지질은 여러 암석과 지형이 복잡하게 나타나요 — 특징을 이해하기 쉽게 단순화했어요." }),
    ]);
    island.appendChild(strataTips);
    let sectionOn = false;
    const secBtn = button("단면 보기", { variant: "gold", icon: "⛰", onClick: () => {
      sectionOn = !sectionOn;
      viewer.setSectionView(sectionOn);
      strataTips.style.display = sectionOn ? "flex" : "none";
      secBtn.querySelector("span:last-child").textContent = sectionOn ? "겉모습 보기" : "단면 보기";
      toast(ctx.stage, sectionOn ? "단순화 단면 모형으로 전환 — 섬의 특징을 관찰해요" : "겉모습 모형으로 전환");
    } });
    Object.assign(secBtn.style, { position: "absolute", right: "10px", bottom: "10px", zIndex: 6, padding: "6px 14px", fontSize: "13px", minHeight: "44px" });
    island.appendChild(secBtn);

    /* 실사 비교: 3D 모형과 실제 독도 사진을 나란히 */
    const photoBtn = button("실사 비교", { variant: "ghost", icon: "📷", onClick: () => {
      const mk = (src, cap) => el("div.col", { style: { gap: "4px", alignItems: "center" } }, [
        (() => { const i = assetImg(src, cap); Object.assign(i.style, { width: "300px", height: "186px", objectFit: "cover", borderRadius: "10px", boxShadow: "var(--shadow-sm)" }); return i; })(),
        el("span", { style: { fontSize: "12.5px", fontWeight: "800", color: "var(--navy)" }, text: cap }),
      ]);
      const body = el("div.col", { style: { gap: "10px" } }, [
        el("div.row", { style: { gap: "10px", justifyContent: "center" } }, [
          mk(PHOTOS.seodo, "서도 — 뾰족한 쌍봉 (168.5m)"),
          mk(PHOTOS.dongdo, "동도 — 낮고 평평한 정상 (98.6m)"),
        ]),
        el("div.row", { style: { gap: "10px", justifyContent: "center" } }, [
          mk(PHOTOS.both, "두 섬의 배치 — 바다에서 본 모습"),
          mk(PHOTOS.strata, "삼형제굴 — 파도가 깎은 단면"),
        ]),
        el("div.tip", { html: "3D 모형을 돌려 보며 <b>실제 사진과 같은 각도</b>를 찾아봐요! 어느 쪽이 서도일까요?" }),
        el("div.src-tag", { text: "📎 사진: 외교부 독도" }),
      ]);
      const md = modal(ctx.stage, { title: "실제 독도와 비교해 봐요", icon: "📷", body,
        buttons: [button("닫기", { variant: "green", onClick: () => md.close() })] });
    } });
    Object.assign(photoBtn.style, { position: "absolute", right: "10px", top: "48px", zIndex: 6, padding: "6px 14px", fontSize: "13px", minHeight: "44px" });
    island.appendChild(photoBtn);

    /* 전체 화면 보기: 큰 뷰어(줌인·줌아웃 자유) */
    const fullBtn = button("전체 화면", { variant: "ghost", icon: "⛶", onClick: () => {
      const big = createDokdoGlbDiorama({ width: 980, height: 520, minDistance: 2.2, maxDistance: 16 });
      const body = el("div", { style: { position: "relative", background: "linear-gradient(180deg,#dcedfa,#c3ddf1)", borderRadius: "14px", overflow: "hidden" } }, [
        big.el,
        el("div", { style: { position: "absolute", left: "0", right: "0", bottom: "8px", textAlign: "center", fontSize: "13px", fontWeight: "800", color: "var(--navy)", opacity: ".8", pointerEvents: "none" },
          text: "드래그 회전 · 휠/두 손가락 줌 — 절벽·등대·접안시설까지 자세히 살펴봐요" }),
      ]);
      const m = modal(ctx.stage, {
        title: "3D 독도 — 전체 화면 탐험", icon: "⛶",
        body,
        buttons: [button("닫기", { variant: "green", onClick: () => { big.stage.dispose(); m.close(); } })],
      });
      m.el.querySelector(".modal").style.maxWidth = "1060px";
      m.el.addEventListener("pointerdown", (e) => { if (e.target === m.el) big.stage.dispose(); });
    } });
    Object.assign(fullBtn.style, { position: "absolute", right: "10px", top: "92px", zIndex: 6, padding: "6px 14px", fontSize: "13px", minHeight: "44px" });
    island.appendChild(fullBtn);
  } else {
    /* ---- 2D 폴백: 실사 항공 사진 + 단서 라벨 ---- */
    const islandImg = assetImg(PHOTOS.aerial, "독도 항공 사진");
    islandImg.style.cssText = "width:100%;height:100%;object-fit:cover";
    island.appendChild(islandImg);
    island.appendChild(hudPill("🔍 실제 독도 사진", { variant: "sea", style: { position: "absolute", left: "10px", top: "10px", zIndex: 6 } }));
    island.appendChild(el("div", { style: { position: "absolute", left: "10px", bottom: "8px", zIndex: 6, fontSize: "11px", fontWeight: "700", color: "#fff", background: "rgba(0,0,0,.68)", padding: "1px 8px", borderRadius: "999px" }, text: "사진: 외교부 독도" }));
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
  }
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
  placeAsset(layer, DOKDO.robotCrab, { x: 440, y: 540, w: 150, h: 165, alt: "분석 로봇", float: true, z: 3, shadow: true });
  placeAsset(layer, DOKDO.girlScout, { x: 30, y: 528, w: 170, h: 190, alt: "탐험가 소녀", z: 3, shadow: true });

  /* ---- 우측: 문제 보드 + 단서 게이팅 잠금 오버레이 ---- */
  const board = el("div.q-board", { style: { ...pos(620, 128, 640, 512) } }, [el("div.q-board__clip")]);
  const badgeRow = el("div.row", { style: { justifyContent: "center", gap: "8px" } });
  const qTitle = el("div.q-board__title");
  const qHolder = el("div", { style: { flex: "1", overflowY: "auto", paddingRight: "4px" } });
  const nextHolder = el("div.row", { style: { justifyContent: "flex-end", minHeight: "0" } });
  board.appendChild(badgeRow); board.appendChild(qTitle); board.appendChild(qHolder); board.appendChild(nextHolder);

  const lock = lockOverlay({
    title: "지형 단서 4개를 먼저 수집해요",
    desc: "왼쪽 관찰 자료의 단서 라벨을 눌러 단서를 모아요",
  });
  board.appendChild(lock);
  layer.appendChild(board);

  /* ---- 단서 수집 로직 ---- */
  function updateClueChip() {
    const done = collected.size >= clueTotal;
    clueChip.textContent = `${done ? "✅" : "🔍"} 단서 ${collected.size} / ${clueTotal}`;
    if (done) clueChip.style.background = "rgba(47,158,68,.95)";
  }

  function markCollectedVisual(id) {
    if (viewer) viewer.setMarkerCollected(id);
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
    const ph = assetImg(PHOTOS[CLUE_PHOTO[clue.id]], clue.title);
    Object.assign(ph.style, { width: "340px", height: "200px", objectFit: "cover", borderRadius: "12px", boxShadow: "var(--shadow-sm)" });
    const body = el("div.col", { style: { gap: "10px", alignItems: "center", textAlign: "center" } }, [
      ph,
      el("div", { style: { fontWeight: "900", fontSize: "20px", color: "var(--navy)" }, text: clue.icon + " " + clue.title }),
      el("div", { style: { fontSize: "15px", fontWeight: "700", color: "var(--ink-soft)", lineHeight: "1.55" }, html: clue.desc.join("<br>") }),
      el("div.src-tag", { text: "📎 사진: 외교부 독도" }),
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
    awardDex(ctx, "d-caves");
    toast(ctx.stage, "단서 4개 완성! 문제 보드가 열렸어요");
    lock.style.opacity = "0";
    setTimeout(() => lock.remove(), 320);
    coachify(board, { label: null });
    board.addEventListener("pointerdown", () => uncoach(board), { once: true });
  }

  /* ---- 연결 활동: 지형 특징 ↔ 영향 (특징을 누르고 어울리는 영향을 이어 누르기) ---- */
  const PAIR_COLORS = ["#1f7ac2", "#2f9e44", "#c9962a", "#8a5a2b"];
  function renderMatch(m, onDone) {
    const paired = {}; // featureId -> effect pair id
    let selFeat = null;
    const effects = [...m.pairs].sort(() => Math.random() - 0.5);
    const fb = el("div.feedback");
    const btnBase = {
      fontFamily: "inherit", textAlign: "left", fontSize: "14px", fontWeight: "800", color: "var(--ink)",
      background: "#fff", border: "2px solid #b9c7d6", borderRadius: "12px", padding: "9px 12px",
      cursor: "pointer", lineHeight: "1.4", wordBreak: "keep-all", minHeight: "48px", width: "100%",
    };
    const featBtns = new Map(), effBtns = new Map();
    let locked = false;

    function paint() {
      m.pairs.forEach((p, i) => {
        const fBtn = featBtns.get(p.id);
        const col = PAIR_COLORS[i];
        const has = !!paired[p.id];
        fBtn.style.borderColor = selFeat === p.id ? "var(--gold-deep)" : has ? col : "#b9c7d6";
        fBtn.style.background = selFeat === p.id ? "#fff6da" : has ? col + "18" : "#fff";
      });
      effects.forEach((e) => {
        const eBtn = effBtns.get(e.id);
        const owner = Object.keys(paired).find((f) => paired[f] === e.id);
        const col = owner ? PAIR_COLORS[m.pairs.findIndex((p) => p.id === owner)] : null;
        eBtn.style.borderColor = col || "#b9c7d6";
        eBtn.style.background = col ? col + "18" : "#fff";
      });
      confirm.disabled = Object.keys(paired).length < m.pairs.length;
    }

    m.pairs.forEach((p) => {
      const b = el("button", { type: "button", style: { ...btnBase }, text: "⛰ " + p.feature });
      b.addEventListener("click", () => {
        if (locked) return;
        AudioManager.unlock(); AudioManager.click();
        if (paired[p.id]) delete paired[p.id]; // 다시 누르면 연결 해제
        selFeat = selFeat === p.id ? null : p.id;
        paint();
      });
      featBtns.set(p.id, b);
    });
    effects.forEach((e) => {
      const b = el("button", { type: "button", style: { ...btnBase }, text: e.effect });
      b.addEventListener("click", () => {
        if (locked || !selFeat) return;
        AudioManager.unlock(); AudioManager.click();
        for (const f of Object.keys(paired)) if (paired[f] === e.id) delete paired[f]; // 한 영향엔 한 특징만
        paired[selFeat] = e.id;
        selFeat = null;
        paint();
      });
      effBtns.set(e.id, b);
    });

    const confirm = button("연결 확인", { variant: "gold", icon: "🔗", disabled: true, onClick: () => {
      const wrong = m.pairs.filter((p) => paired[p.id] !== p.id);
      if (wrong.length) {
        stats.wrong++;
        AudioManager.wrong();
        wrong.forEach((p) => delete paired[p.id]); // 틀린 연결만 풀어 재도전
        paint();
        fb.className = "feedback show feedback--no";
        fb.textContent = `🤔 ${wrong.length}개 연결이 아직 맞지 않아요. 특징이 생활·자연에 어떤 영향을 줄지 다시 생각해 봐요.`;
        return;
      }
      locked = true;
      AudioManager.correct();
      fb.className = "feedback show feedback--ok";
      fb.textContent = "✅ 지형 특징과 영향을 모두 바르게 연결했어요!";
      confirm.style.display = "none";
      onDone();
    } });

    const grid = el("div.row", { style: { gap: "10px", alignItems: "stretch" } }, [
      el("div.col", { style: { gap: "8px", flex: "1" } }, [...featBtns.values()]),
      el("div.col", { style: { gap: "8px", flex: "1" } }, [...effBtns.values()]),
    ]);
    const node = el("div.col", { style: { gap: "10px" } }, [
      el("div.tip", { style: { fontSize: "13px", padding: "7px 12px" }, html: "왼쪽 <b>특징</b>을 누른 뒤, 어울리는 <b>영향</b>을 이어서 눌러요. 색이 같으면 연결된 거예요." }),
      grid,
      el("div.row", { style: { justifyContent: "center" } }, [confirm]),
      fb,
    ]);
    paint();
    return node;
  }

  /* ---- 문제 진행 ---- */
  function render() {
    const q = FLOW[qi];
    const isMulti = q.type === "multiple_choice";
    frame.setStep(qi + 1, total, "문제");
    badgeRow.innerHTML = "";
    badgeRow.appendChild(el("span", { style: { background: "linear-gradient(180deg,var(--sea),var(--sea-deep))", color: "#fff", fontWeight: "900", fontSize: "14px", padding: "5px 16px", borderRadius: "999px" }, text: `문제 ${qi + 1} / ${total}` }));
    if (isMulti) badgeRow.appendChild(el("span", { style: { background: "var(--gold)", color: "#5c3c05", fontWeight: "800", fontSize: "13px", padding: "5px 12px", borderRadius: "999px" }, text: `정답 ${q.answer.length}개` }));
    if (q.type === "match") badgeRow.appendChild(el("span", { style: { background: "var(--green)", color: "#fff", fontWeight: "800", fontSize: "13px", padding: "5px 12px", borderRadius: "999px" }, text: "연결하기" }));

    qTitle.innerHTML = q.prompt;
    qHolder.innerHTML = "";
    nextHolder.innerHTML = "";
    const onSolved = () => {
      if (qi < total - 1) {
        nextHolder.appendChild(nextCoachButton("다음 문제", () => { qi++; render(); }));
      } else {
        nextHolder.appendChild(nextCoachButton("미션 완료!", () =>
          completeMission(ctx, "geology", { evidence: "c-geo", message: "독도는 가파른 바위 지형이 많아 평지가 제한적임을 분석했어요." }), { icon: "🏅" }));
      }
    };
    if (q.type === "match") {
      qHolder.appendChild(renderMatch(q, onSolved));
    } else {
      const qc = quiz(q, { confirmLabel: "정답 확인", confirmAlign: "center", onResult: (ok) => { if (ok) onSolved(); } });
      qHolder.appendChild(qc.node);
    }
  }
  render();
  return root;
}
