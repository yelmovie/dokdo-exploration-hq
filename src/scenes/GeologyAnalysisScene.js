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

/* 단면 모형 번호 배지 ①~④ 설명 (3D 오버레이 — 이미지에 글자를 박지 않는다) */
const SECTION_FEATURES = [
  { n: 1, label: "가파른 바위 절벽", desc: "이동과 시설 설치가 어려워요" },
  { n: 2, label: "좁은 평지", desc: "넓은 생활공간을 만들기 어려워요" },
  { n: 3, label: "화산 조각이 굳은 암석층", desc: "독도가 화산활동과 관련 있음을 보여 줘요" },
  { n: 4, label: "파도에 깎인 해안 바위", desc: "바람과 파도가 지형에 영향을 줘요" },
];

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
    viewer = createDokdoTerrain3D({ root, width: 560, height: 300, glbSrc: "public/models/dokdo_diorama.glb",
      onMarkerSelect: (id) => {
        const clue = GEOLOGY_CLUES.find((c) => c.id === id);
        if (!clue) return;
        AudioManager.unlock(); AudioManager.click();
        openClue(clue);
      },
      onSectionMarkerSelect: (n) => showSectionCaption(n),
    });
    Object.assign(viewer.el.style, { width: "100%", height: "100%" });
    island.appendChild(viewer.el);
    const explorePill = hudPill("🧭 3D 독도 탐험", { variant: "sea", style: { position: "absolute", left: "10px", top: "10px", zIndex: 6 } });
    island.appendChild(explorePill);
    island.appendChild(el("div", { style: { position: "absolute", left: "10px", bottom: "8px", zIndex: 6, fontSize: "11.5px", fontWeight: "800", color: "var(--navy)", background: "rgba(255,255,255,.88)", padding: "3px 10px", borderRadius: "999px" }, text: "🖐 드래그 회전 · 두 손가락 확대 · 반짝이는 단서 탭" }));

    /* 단면 보기 — 라벨은 3D 위 번호 배지(①~④)로, 텍스트는 헤더 한 줄 + ⓘ 모달로 수납 */
    const secHeader = el("div", { style: { position: "absolute", left: "10px", top: "10px", zIndex: 6, display: "none", alignItems: "center", gap: "6px" } }, [
      el("div", { style: { background: "rgba(20,54,92,.94)", color: "#fff", fontWeight: "800", fontSize: "12.5px", padding: "5px 12px", borderRadius: "999px", boxShadow: "var(--shadow-sm)", wordBreak: "keep-all" },
        text: "🧩 단순화 단면 모형 · 번호를 눌러 봐요" }),
      (() => {
        const b = el("button", { type: "button", attrs: { "aria-label": "단면 모형 설명" }, style: {
          width: "30px", height: "30px", borderRadius: "50%", border: "0", cursor: "pointer",
          background: "rgba(255,255,255,.92)", color: "var(--sea-deep)", fontWeight: "900", fontSize: "15px",
          boxShadow: "var(--shadow-sm)", fontFamily: "inherit",
        }, text: "ⓘ" });
        b.addEventListener("click", () => {
          AudioManager.unlock(); AudioManager.click();
          const md = modal(ctx.stage, {
            title: "단순화 단면 모형이란?", icon: "🧩",
            body: el("div.col", { style: { gap: "10px", maxWidth: "440px" } }, [
              el("div", { style: { fontSize: "14.5px", fontWeight: "700", color: "var(--ink)", lineHeight: "1.6", wordBreak: "keep-all" },
                text: "독도는 화산활동으로 만들어진 바위섬이에요. 실제 지질은 여러 암석과 지형이 복잡하게 나타나지만, 이 화면에서는 독도의 특징을 이해하기 쉽게 단순화해 보여 줍니다." }),
              el("div.col", { style: { gap: "5px" } }, SECTION_FEATURES.map((f) =>
                el("div", { style: { fontSize: "13.5px", fontWeight: "800", color: "var(--navy)", background: "rgba(31,122,194,.08)", borderRadius: "9px", padding: "6px 12px", wordBreak: "keep-all" },
                  text: `${"①②③④"[f.n - 1]} ${f.label} — ${f.desc}` }))),
            ]),
            buttons: [button("알겠어요!", { variant: "green", onClick: () => md.close() })],
          });
        });
        return b;
      })(),
    ]);
    island.appendChild(secHeader);

    /* 번호 배지 탭 → 하단 한 줄 설명 (자동 숨김) */
    const secCaption = el("div", { style: {
      position: "absolute", left: "50%", bottom: "42px", transform: "translateX(-50%)", zIndex: 6,
      display: "none", maxWidth: "92%", background: "rgba(20,54,92,.94)", color: "#fff",
      fontWeight: "800", fontSize: "13px", padding: "7px 16px", borderRadius: "999px",
      boxShadow: "var(--shadow-sm)", wordBreak: "keep-all", textAlign: "center", pointerEvents: "none",
    } });
    island.appendChild(secCaption);
    let capTimer = 0;
    function showSectionCaption(n) {
      const f = SECTION_FEATURES.find((x) => x.n === n);
      if (!f) return;
      AudioManager.click();
      secCaption.textContent = `${"①②③④"[n - 1]} ${f.label} — ${f.desc}`;
      secCaption.style.display = "block";
      clearTimeout(capTimer);
      capTimer = setTimeout(() => { secCaption.style.display = "none"; }, 4500);
    }

    let sectionOn = false;
    const secBtn = button("단면 보기", { variant: "gold", icon: "⛰", onClick: () => {
      sectionOn = !sectionOn;
      viewer.setSectionView(sectionOn);
      secHeader.style.display = sectionOn ? "flex" : "none";
      if (explorePill) explorePill.style.display = sectionOn ? "none" : "";
      if (!sectionOn) { secCaption.style.display = "none"; clearTimeout(capTimer); }
      secBtn.querySelector("span:last-child").textContent = sectionOn ? "겉모습 보기" : "단면 보기";
      toast(ctx.stage, sectionOn ? "단순화 단면 모형 — 번호 배지를 눌러 특징을 살펴봐요" : "겉모습 모형으로 전환");
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
  const board = el("div.q-board", { style: { ...pos(620, 128, 640), minHeight: "300px", maxHeight: "524px" } }, [el("div.q-board__clip")]); // 높이는 내용 맞춤
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

  /* ---- 연결 활동: 특징 탭 → 영향 탭 = 두 카드 사이에 실선 (4개 완성 시 자동 채점) ---- */
  const PAIR_COLORS = ["#1f7ac2", "#2f9e44", "#c9962a", "#8a5a2b"];
  const FEATURE_SHORT = {
    steep_cliff: "⛰ 바위 절벽", narrow_flatland: "🏕 좁은 평지",
    volcanic_rock_layer: "🪨 굳은 암석층", wave_eroded_coast: "🌊 해안 바위",
  };
  function renderMatch(m, onDone) {
    const paired = {}; // featureId -> effect pair id
    let locked = false;
    const effects = [...m.pairs].sort(() => Math.random() - 0.5);
    const fb = el("div.feedback");
    const btnBase = {
      fontFamily: "inherit", textAlign: "left", fontSize: "14px", fontWeight: "800", color: "var(--ink)",
      background: "#fff", border: "2px solid #b9c7d6", borderRadius: "12px", padding: "9px 12px",
      cursor: "pointer", lineHeight: "1.4", wordBreak: "keep-all", minHeight: "48px", width: "100%",
      transition: "border-color .12s, background .12s",
    };
    const featBtns = new Map(), effBtns = new Map();

    /* 카드 사이 실선용 SVG 오버레이 */
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible";

    const mkLine = (x1, y1, x2, y2, col, dash) => {
      const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
      ln.setAttribute("x1", x1); ln.setAttribute("y1", y1);
      ln.setAttribute("x2", x2); ln.setAttribute("y2", y2);
      ln.setAttribute("stroke", col);
      ln.setAttribute("stroke-width", "3.5");
      ln.setAttribute("stroke-linecap", "round");
      if (dash) ln.setAttribute("stroke-dasharray", "7 5");
      return ln;
    };
    const featDots = new Map(), effDots = new Map(); // id -> { pad, dot }
    let tempLine = null; // 드래그 중 임시 선

    /** 점(작은 원) 중심의 grid 로컬 좌표 — 스테이지 스케일 보정 */
    function dotCenter(elm) {
      const g = grid.getBoundingClientRect();
      const r = elm.getBoundingClientRect();
      const k = g.width ? grid.clientWidth / g.width : 1;
      return { x: (r.left + r.width / 2 - g.left) * k, y: (r.top + r.height / 2 - g.top) * k };
    }
    function drawLines() {
      svg.innerHTML = "";
      Object.entries(paired).forEach(([fid, eid]) => {
        const fd = featDots.get(fid), ed = effDots.get(eid);
        if (!fd || !ed) return;
        const col = PAIR_COLORS[m.pairs.findIndex((p) => p.id === fid)];
        const a = dotCenter(fd.dot), b2 = dotCenter(ed.dot);
        svg.appendChild(mkLine(a.x, a.y, b2.x, b2.y, col));
      });
      if (tempLine) svg.appendChild(tempLine);
    }

    function paint() {
      const isSel = (side, id) => sel && sel.side === side && sel.id === id;
      m.pairs.forEach((p, i) => {
        const b = featBtns.get(p.id);
        const col = PAIR_COLORS[i];
        const has = !!paired[p.id];
        const on = isSel("feat", p.id);
        b.style.borderColor = on ? "var(--gold-deep)" : has ? col : "#b9c7d6";
        b.style.background = on ? "#fff6da" : has ? col + "18" : "#fff";
        b.style.boxShadow = on ? "0 0 0 3px rgba(255,217,104,.5)" : "";
        const fd = featDots.get(p.id);
        if (fd) {
          fd.dot.style.borderColor = on ? "var(--gold-deep)" : has ? col : "#8fa4b8";
          fd.dot.style.background = on ? "var(--gold)" : has ? col : "#fff";
          fd.dot.style.transform = on ? "scale(1.35)" : "";
        }
      });
      effects.forEach((e) => {
        const b = effBtns.get(e.id);
        const owner = Object.keys(paired).find((f) => paired[f] === e.id);
        const col = owner ? PAIR_COLORS[m.pairs.findIndex((p) => p.id === owner)] : null;
        const on = isSel("eff", e.id);
        b.style.borderColor = on ? "var(--gold-deep)" : col || "#b9c7d6";
        b.style.background = on ? "#fff6da" : col ? col + "18" : "#fff";
        b.style.boxShadow = on ? "0 0 0 3px rgba(255,217,104,.5)" : "";
        const ed = effDots.get(e.id);
        if (ed) {
          ed.dot.style.borderColor = on ? "var(--gold-deep)" : col || "#8fa4b8";
          ed.dot.style.background = on ? "var(--gold)" : col || "#fff";
          ed.dot.style.transform = on ? "scale(1.35)" : "";
        }
      });
      drawLines(); // offset 읽기가 동기 레이아웃을 강제하므로 rAF 없이 즉시 정확
    }

    /* 4개 연결 완료 → 자동 채점 (확인 버튼 없음) */
    function autoCheck() {
      if (Object.keys(paired).length < m.pairs.length) return;
      setTimeout(() => {
        const wrong = m.pairs.filter((p) => paired[p.id] !== p.id);
        if (wrong.length) {
          AudioManager.wrong();
          wrong.forEach((p) => delete paired[p.id]); // 틀린 연결만 풀어 재도전
          grid.classList.add("is-shake");
          setTimeout(() => grid.classList.remove("is-shake"), 400);
          paint();
          fb.className = "feedback show feedback--no";
          fb.textContent = `🤔 ${wrong.length}개 연결이 풀렸어요. 그 특징이 생활·자연에 어떤 영향을 줄지 다시 생각해 봐요.`;
          return;
        }
        locked = true;
        AudioManager.correct();
        fb.className = "feedback show feedback--ok";
        fb.textContent = "✅ 지형 특징과 영향을 모두 바르게 연결했어요!";
        onDone();
      }, 380);
    }

    /* 좌표 변환: 화면(client) → grid 로컬 px (스테이지 scale 보정) */
    function toLocal(clientX, clientY) {
      const r = grid.getBoundingClientRect();
      const k = r.width ? grid.clientWidth / r.width : 1;
      return { x: (clientX - r.left) * k, y: (clientY - r.top) * k };
    }
    /** 반대편 카드/점 히트 테스트 — 카드와 터치 패드 어느 쪽에 놓아도 인식 */
    function targetAt(btnMap, dotMap, clientX, clientY) {
      for (const [id, b] of btnMap) {
        const rects = [b.getBoundingClientRect()];
        const d = dotMap.get(id);
        if (d) rects.push(d.pad.getBoundingClientRect());
        for (const r of rects) {
          if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) return id;
        }
      }
      return null;
    }

    /** 연결점: 작은 원(18px) + 넉넉한 터치 패드(44px). 양쪽 카드에 모두 붙는다 */
    function makeDot(side) {
      const pad = el("div", { style: {
        position: "absolute", [side]: "-50px", top: "50%", transform: "translateY(-50%)",
        width: "44px", height: "44px", display: "flex", alignItems: "center", justifyContent: "center",
        cursor: "grab", touchAction: "none", zIndex: 3,
      } });
      const dot = el("div", { style: {
        width: "18px", height: "18px", borderRadius: "50%",
        background: "#fff", border: "2.5px solid #8fa4b8", boxShadow: "var(--shadow-sm)",
        pointerEvents: "none",
      } });
      pad.appendChild(dot);
      return { pad, dot };
    }

    /* 선택 상태 (탭-탭 연결의 1단계) */
    let sel = null; // { side: "feat"|"eff", id }

    /** 연결 확정 — 1:1 규칙 적용 후 자동 채점 */
    function connect(fid, eid) {
      for (const f of Object.keys(paired)) if (paired[f] === eid) delete paired[f]; // 한 영향엔 한 특징만
      paired[fid] = eid;
      sel = null;
      AudioManager.click();
      paint();
      autoCheck();
    }

    /** 탭 한 번 = 고르기 / 반대쪽 탭 = 연결 (초등학생 기본 조작) */
    function tapSelect(side, id) {
      if (locked) return;
      AudioManager.unlock();
      if (sel && sel.side !== side) {          // 반대쪽이 골라져 있으면 → 연결!
        const fid = side === "feat" ? id : sel.id;
        const eid = side === "eff" ? id : sel.id;
        connect(fid, eid);
        return;
      }
      if (sel && sel.side === side && sel.id === id) sel = null; // 같은 카드 재탭 = 취소
      else {
        sel = { side, id };
        toast(ctx.stage, "좋아요! 이제 반대쪽 카드를 눌러 연결해요");
      }
      AudioManager.click();
      paint();
    }

    /** 드래그(보조 조작): 점을 끌어 반대편에 놓기. 탭이면 tapSelect 로 처리 */
    function wireDrag(pad, ownDot, from) { // from: {side:"feat"|"eff", id}
      let sx = 0, sy = 0, dragging = false;
      pad.addEventListener("pointerdown", (ev) => {
        if (locked) return;
        ev.preventDefault(); ev.stopPropagation();
        AudioManager.unlock();
        try { pad.setPointerCapture(ev.pointerId); } catch { /* 무시 */ }
        sx = ev.clientX; sy = ev.clientY; dragging = false;
      });
      pad.addEventListener("pointermove", (ev) => {
        if (ev.buttons === 0 && !dragging) return;
        if (!dragging) {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 8) return; // 아직 탭 범위
          dragging = true;
          // 드래그 시작 시에만 기존 연결 해제
          if (from.side === "feat") delete paired[from.id];
          else for (const f of Object.keys(paired)) if (paired[f] === from.id) delete paired[f];
          const ci = Math.max(0, m.pairs.findIndex((p) => p.id === from.id));
          const a = dotCenter(ownDot);
          tempLine = mkLine(a.x, a.y, a.x, a.y, PAIR_COLORS[ci] || "#1f7ac2", true);
          pad.style.cursor = "grabbing";
          sel = null;
          paint();
        }
        const lp = toLocal(ev.clientX, ev.clientY);
        tempLine.setAttribute("x2", lp.x);
        tempLine.setAttribute("y2", lp.y);
        drawLines();
        const overId = from.side === "feat"
          ? targetAt(effBtns, effDots, ev.clientX, ev.clientY)
          : targetAt(featBtns, featDots, ev.clientX, ev.clientY);
        const overMap = from.side === "feat" ? effBtns : featBtns;
        if (overId) {
          const ob = overMap.get(overId);
          ob.style.borderColor = "var(--gold-deep)";
          ob.style.background = "#fff6da";
        }
      });
      const endDrag = (ev) => {
        try { pad.releasePointerCapture(ev.pointerId); } catch { /* 무시 */ }
        if (!dragging) { tapSelect(from.side, from.id); return; } // 점을 '탭'해도 고르기
        dragging = false;
        tempLine = null;
        pad.style.cursor = "grab";
        let fid = null, eid = null;
        if (from.side === "feat") {
          fid = from.id;
          eid = targetAt(effBtns, effDots, ev.clientX, ev.clientY);
        } else {
          eid = from.id;
          fid = targetAt(featBtns, featDots, ev.clientX, ev.clientY);
        }
        if (fid && eid) connect(fid, eid);
        else paint();
      };
      pad.addEventListener("pointerup", endDrag);
      pad.addEventListener("pointercancel", endDrag);
    }

    m.pairs.forEach((p) => {
      const b = el("button", { type: "button", style: { ...btnBase, position: "relative" }, text: FEATURE_SHORT[p.id] || p.feature });
      b.title = p.feature;
      const { pad, dot } = makeDot("right");
      b.appendChild(pad);
      featDots.set(p.id, { pad, dot });
      wireDrag(pad, dot, { side: "feat", id: p.id });
      b.addEventListener("click", () => tapSelect("feat", p.id)); // 카드 전체가 탭 대상
      featBtns.set(p.id, b);
    });
    effects.forEach((e) => {
      const b = el("button", { type: "button", style: { ...btnBase, position: "relative" }, text: e.effect });
      const { pad, dot } = makeDot("left");
      b.appendChild(pad);
      effDots.set(e.id, { pad, dot });
      wireDrag(pad, dot, { side: "eff", id: e.id });
      b.addEventListener("click", () => tapSelect("eff", e.id)); // 카드 전체가 탭 대상
      effBtns.set(e.id, b);
    });

    const grid = el("div.row", { style: { position: "relative", gap: "104px", alignItems: "stretch" } }, [
      el("div.col", { style: { gap: "12px", flex: "0 0 166px" } }, [...featBtns.values()]),
      el("div.col", { style: { gap: "12px", flex: "1" } }, [...effBtns.values()]),
    ]);
    grid.appendChild(svg);

    const node = el("div.col", { style: { gap: "10px" } }, [
      el("div.tip", { style: { fontSize: "14.5px", padding: "7px 12px" }, html: "① <b>카드를 한 번 눌러</b> 고르고 ② <b>반대쪽 카드를 누르면</b> 선으로 연결! (● 점을 끌어도 돼요) 4개를 다 이으면 자동 확인!" }),
      grid,
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
    // 진행 도트 — 6단계 위치를 한눈에
    badgeRow.appendChild(el("span", { style: { alignSelf: "center", fontSize: "12px", letterSpacing: "3px", color: "var(--sea-deep)", fontWeight: "900" },
      text: FLOW.map((_, i) => (i <= qi ? "●" : "○")).join("") }));

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
