/* =========================================================================
   10페이지 - 수료 및 전시 (CompletionGalleryScene) (샘플 10 대응)
   중앙 수료증 + 대형 수료 배지 + 축하 캐릭터.
   2026-07 3D 개편: 좌측에 three.js "독도 작은 섬 디오라마" 전시 모형,
   보호 다짐 입력, 마무리 성찰 카드, 탐사 결과 다시보기 모달 추가.
   WebGL 미지원 기기는 디오라마 없이 기존 정적 구성을 유지한다.
   ========================================================================= */
import { el } from "../core/dom.js";
import { buildScene, placeAsset, backButton, homeButton, button, pos, toast, collapsible, modal, sign } from "../components/ui.js";
import { assetImg } from "../core/dom.js";
import { ICONS, DOKDO, PHOTOS } from "../config/assetManifest.js";
import { TODAY_DOKDO } from "../data/questions.js";
import { awardDex } from "./_shared.js";
import AudioManager from "../managers/AudioManager.js";
import { supportsWebGL } from "../components/three/ThreeStage.js";
import { createDokdoGlbDiorama } from "../components/three/DokdoGlbDiorama.js";
import PAGES from "../config/pageConfig.js";
import { MISSIONS, BRIEFING_FIELDS, isAllComplete } from "../data/missions.js";
/* 3D 디오라마는 이후 단계에서 복구 예정 (_recovered/ 참고) */


export default function CompletionGalleryScene(ctx) {
  const { root, layer } = buildScene({ bg: PAGES.completion.bg, veil: "soft" });
  const save = ctx.save;
  const badges = save.get("badges");
  const allDone = isAllComplete(save.get("completedMissions"));

  if (allDone) awardDex(ctx, "d-today");

  /* ---- 입장 연출: 임무 완수 (전체 완료 시 1회, 탭으로 건너뛰기) ---- */
  if (allDone && !ctx.stage.__finaleShown) {
    ctx.stage.__finaleShown = true;
    const badgeImg = assetImg(DOKDO.badgeFinal, "수료 배지");
    badgeImg.className = "finale__badge";
    const stars = [];
    for (let i = 0; i < 34; i++) {
      const s = el("div.finale__star");
      const sz = 2 + (i % 4);
      s.style.width = s.style.height = sz + "px";
      s.style.left = (i * 137.5 % 100) + "%";                 // 황금각 분산 배치
      s.style.top = (7 + (i * 61.8 % 86)) + "%";
      s.style.animationDuration = (2 + (i % 5) * 0.7) + "s";
      s.style.animationDelay = (i % 7) * 0.4 + "s";
      if (i % 5 === 0) s.style.background = "#ffd968";        // 일부는 금빛 별
      stars.push(s);
    }
    const finale = el("div.finale", {}, [
      el("div.finale__glow"),
      ...stars,
      badgeImg,
      el("div.finale__line1", { text: "MISSION COMPLETE" }),
      el("div.finale__line2", { html: "독도는, 대한민국입니다" }),
      el("div.finale__line3", { text: "512년 신라의 기록부터 오늘의 우리까지 — 근거로 증명한 우리 땅" }),
      el("div.finale__skip", { text: "화면을 누르면 넘어가요" }),
    ]);
    // 컨페티 (모션 최소화 설정이면 CSS 가 애니메이션을 끔)
    const colors = ["#f5c542", "#4ea3e0", "#ffffff", "#2f9e44", "#e05252"];
    for (let i = 0; i < 26; i++) {
      const c = el("div.confetti");
      c.style.left = (i * 47 % 100) + "%";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (2.4 + (i % 5) * 0.5) + "s";
      c.style.animationDelay = (i % 7) * 0.22 + "s";
      finale.appendChild(c);
    }
    const dismiss = () => {
      finale.style.opacity = "0";
      finale.style.pointerEvents = "none";
      setTimeout(() => finale.remove(), 650);
    };
    finale.addEventListener("pointerdown", dismiss);
    const autoT = setTimeout(dismiss, 4600);
    (root.__disposers = root.__disposers || []).push(() => clearTimeout(autoT));
    layer.appendChild(finale);
  }


  /* ---- 상단: 이전 / 명패 / 결과 남기기 / 홈 ---- */
  layer.appendChild(el("div.row", { style: { ...pos(22, 20), gap: "12px", zIndex: 12 } }, [
    backButton(() => ctx.navigate("missionMap")),
  ]));
  sign(layer, DOKDO.signComplete, { x: 106, y: -24, w: 118, h: 118, alt: "탐사 수료관" }); // 아래 '나의 보호 다짐' 카드와 안 겹치게 소형·상향
  layer.appendChild(el("div.row", { style: { ...pos(920, 20, 340), gap: "10px", zIndex: 12, justifyContent: "flex-end", alignItems: "center" } }, [
    button("수료증 저장", { variant: "gold", size: "sm", icon: "🖼", onClick: openCertSaveModal }),
    homeButton(() => confirmGoMain()),
  ]));

  /* ---- 장식 + 축하 캐릭터 ---- */
  placeAsset(layer, ICONS.bunting, { x: 360, y: 46, w: 560, h: 110, alt: "축하 장식", z: 3 });
  placeAsset(layer, DOKDO.girlScout, { x: 985, y: 292, w: 225, h: 310, alt: "축하하는 탐험가 소녀", z: 5 }); // 망원경과 팻말 사이 울타리 앞

  /* ---- 좌측: 전시 모형 (독도 모형 이미지 — 3D 디오라마는 이후 단계) ---- */
  layer.appendChild(el("div", {
    style: {
      ...pos(33, 166, 314), zIndex: 6, background: "rgba(255,255,255,.9)",
      border: "3px solid var(--sea)", borderRadius: "18px",
      boxShadow: "0 8px 16px rgba(20,54,92,.2)", overflow: "hidden",
    },
  }, [
    el("div.row", { style: { alignItems: "center", gap: "8px", padding: "8px 14px", background: "linear-gradient(180deg, var(--sea-light), var(--sea))", color: "#fff", fontWeight: "900", fontSize: "16px" } }, [
      el("span", { text: "🏝️" }),
      el("span", { text: "전시 모형 · 독도 작은 섬" }),
    ]),
    (() => {
      const holder = el("div", { style: { position: "relative", width: "100%", height: "260px", background: "linear-gradient(180deg,#eaf4fc,#d8ecf9)", display: "flex", alignItems: "center", justifyContent: "center" } });
      const fallbackImg = () => {
        holder.innerHTML = "";
        const img = assetImg(DOKDO.islandModel, "독도 전시 모형");
        Object.assign(img.style, { width: "86%", height: "86%", objectFit: "contain" });
        img.classList.add("floaty");
        holder.appendChild(img);
      };
      if (supportsWebGL()) {
        const dio = createDokdoGlbDiorama({ root, width: 308, height: 260, onError: fallbackImg });
        holder.appendChild(dio.el);
        holder.appendChild(el("div", {
          style: { position: "absolute", left: "0", right: "0", bottom: "6px", textAlign: "center", fontSize: "12.5px", fontWeight: "800", color: "var(--navy)", opacity: ".75", pointerEvents: "none" },
          text: "돌려 보기 · 누르면 크게 보기",
        }));
        /* 크게 보기: 전체창 확대 뷰어 (줌인·줌아웃 자유) */
        const bigBtn = button("크게 보기", { variant: "ghost", size: "sm", icon: "🔍", onClick: openBigViewer });
        Object.assign(bigBtn.style, { position: "absolute", right: "6px", top: "6px", zIndex: 5, minHeight: "40px", padding: "6px 12px", fontSize: "12.5px" });
        holder.appendChild(bigBtn);
      } else {
        fallbackImg();
      }
      return holder;
    })(),
  ]));
  placeAsset(layer, DOKDO.boyScout, { x: 66, y: 446, w: 185, h: 258, alt: "축하하는 탐험가 소년", z: 4 }); // 좌측 꽃밭 앞으로 이동 (배지 줄과 안 겹침)

  /* ---- 중앙 수료증(CSS) + 수료 배지(이미지) ---- */
  const cert = el("div.panel.panel--parchment", { style: { ...pos(390, 140, 500), zIndex: 4, textAlign: "center", padding: "0", border: "4px solid var(--gold-deep)" } }, [
    el("div", { style: { padding: "14px 30px 20px" } }, [
      (() => {
        const w = el("div", { style: { width: "154px", height: "154px", margin: "0 auto" } });
        const img = assetImg(DOKDO.badgeFinal, "수료 배지");
        Object.assign(img.style, { width: "100%", height: "100%", objectFit: "contain" });
        w.appendChild(img);
        return w;
      })(),
      el("div", { style: { fontSize: "28px", fontWeight: "900", color: "var(--navy)", margin: "8px 0 3px" }, text: "독도 탐사본부 수료" }),
      el("div", { style: { fontSize: "14.5px", color: "var(--ink-soft)", fontWeight: "700" }, text: "위치 · 지형 · 역사 · 생태 · 보호 미션 완료" }),
      el("div", { style: { margin: "10px auto", width: "60%", height: "2px", background: "var(--gold-deep)" } }),
      el("div", { style: { fontSize: "16px", fontWeight: "800", color: "var(--green-deep)", lineHeight: "1.5", wordBreak: "keep-all" },
        text: "“독도는 역사적·지리적·국제법적으로 명백한 대한민국의 영토입니다. 우리가 그 근거를 직접 확인했습니다.”" }),
    ]),
  ]);
  layer.appendChild(cert);

  /* ---- 미완료 안내 ---- */
  if (!allDone) {
    cert.style.opacity = "0.45";
    layer.appendChild(el("div", { style: { ...pos(390, 320, 500), zIndex: 8, display: "flex", justifyContent: "center" } }, [
      el("div.tip", { style: { fontSize: "16px" }, html: "💡 아직 완료하지 않은 미션이 있어요.<br><b>미션 지도</b>에서 마저 도전해요!" }),
    ]));
  }

  /* ---- 좌측: 나의 보호 다짐 (마음속으로 고르는 다짐 — 입력·저장 없음) ---- */
  layer.appendChild(collapsible({
    title: "나의 보호 다짐", icon: "🌿",
    style: { ...pos(22, 96, 300), zIndex: 10 },
    body: [el("div.col", { style: { gap: "7px" } }, [
      el("div", { style: { fontSize: "14.5px", fontWeight: "700", color: "var(--navy)", wordBreak: "keep-all" }, text: "독도를 지키기 위한 다짐 하나를 마음에 새겨요." }),
      ...[
        "🌿 자연을 관찰하되 해치지 않을게요.",
        "🗑️ 쓰레기는 꼭 되가져갈게요.",
        "📢 독도를 바르게 알릴게요.",
      ].map((t) => el("div", { style: { fontSize: "14px", fontWeight: "800", color: "var(--ink)", background: "rgba(47,158,68,.08)", borderRadius: "10px", padding: "8px 12px", wordBreak: "keep-all" }, text: t })),
    ])],
  }));

  /* ---- 우측: 오늘의 독도(토글) — 실사 + 정보 카드 ---- */
  layer.appendChild(collapsible({
    title: "지금의 독도", icon: "🗼", variant: "light",
    style: { ...pos(985, 96, 280), zIndex: 10 },
    body: [el("div.col", { style: { gap: "7px" } }, [
      (() => {
        const ph = assetImg(PHOTOS.boat, "지금의 독도");
        Object.assign(ph.style, { width: "100%", height: "110px", objectFit: "cover", borderRadius: "10px" });
        return ph;
      })(),
      ...TODAY_DOKDO.map((t) =>
        el("div", { style: { fontSize: "12.5px", fontWeight: "700", color: "var(--ink)", lineHeight: "1.45", wordBreak: "keep-all" },
          html: `<b>${t.icon} ${t.title}</b> · ${t.text}` })),
      el("div.src-tag", { text: "📎 사진: 외교부 독도" }),
    ])],
  }));

  /* ---- 우측: 마무리 성찰 카드(토글) ---- */
  let memoField = fieldOf(savedMemo.field) ? savedMemo.field : null;
  /* 영역별 핵심 한 문장 — 고르면 '기억해요' 문장이 표시된다 (외교부 자료 기반) */
  const CORE_SENTENCE = {
    location: "📍 독도는 울릉도에서 동쪽 약 87.4km, 동도와 서도로 이루어진 우리 영토예요.",
    geology: "⛰️ 독도는 화산활동으로 만들어진 가파른 바위섬이라 평지가 좁아요.",
    history: "📜 세종실록 지리지(1454)와 대한제국 칙령 제41호(1900)에 독도가 기록되어 있어요.",
    ecology: "🌿 독도에는 식물 약 60종, 새 약 160종이 사는 소중한 생태 공간이에요.",
    protection: "🛡️ 표시된 길에서 조용히 관찰하고 기록으로만 남기며 독도를 지켜요.",
  };
  const coreBox = el("div", { style: {
    display: "none", fontSize: "14.5px", fontWeight: "800", color: "var(--navy)",
    background: "rgba(31,122,194,.08)", borderRadius: "10px", padding: "8px 12px",
    lineHeight: "1.55", wordBreak: "keep-all",
  } });
  function showCore() {
    if (!memoField) return;
    coreBox.style.display = "block";
    coreBox.textContent = CORE_SENTENCE[memoField] || "";
  }
  const chips = BRIEFING_FIELDS.map((f) => {
    const node = el("button", {
      type: "button",
      style: {
        padding: "5px 10px", borderRadius: "999px", border: "2px solid " + f.color,
        background: "#fff", color: f.color, fontWeight: "800", fontSize: "13.5px",
        cursor: "pointer", fontFamily: "inherit", lineHeight: "1.3",
      },
      text: f.icon + " " + f.label,
      onClick: () => { memoField = f.key; paintChips(); showCore(); },
    });
    return { node, f };
  });
  function paintChips() {
    chips.forEach(({ node, f }) => {
      const on = memoField === f.key;
      node.style.background = on ? f.color : "#fff";
      node.style.color = on ? "#fff" : f.color;
    });
  }
  paintChips();
  layer.appendChild(collapsible({
    title: "마무리 성찰 카드", icon: "💭", variant: "gold",
    style: { ...pos(985, 152, 280), zIndex: 9 },
    body: [el("div.col", { style: { gap: "8px" } }, [
      el("div", { style: { fontSize: "14.5px", fontWeight: "700", color: "var(--navy)", wordBreak: "keep-all" }, text: "가장 기억에 남는 근거 영역을 고르고, 핵심 문장을 기억해요." }),
      el("div.row", { style: { gap: "6px", flexWrap: "wrap" } }, chips.map((c) => c.node)),
      coreBox,
    ])],
  }));

  /* ---- 하단: 획득 배지 5종(원형 CSS + 아이콘 이미지) ---- */
  const badgeDefs = MISSIONS.filter((m) => m.badge).map((m) => m.badge);
  const badgeRow = el("div.row", { style: { ...pos(40, 522, 1200), gap: "10px", justifyContent: "center", alignItems: "flex-start", zIndex: 6 } }, [
    el("div", { style: { background: "var(--sea)", color: "#fff", fontWeight: "900", padding: "8px 16px", borderRadius: "999px", alignSelf: "center", marginRight: "8px" }, text: "⭐ 획득한 탐사 배지" }),
    ...badgeDefs.map((b) => {
      const got = badges.includes(b.id);
      const disc = el("div.badge__disc" + (got ? "" : ".is-locked"));
      disc.appendChild(assetImg(b.icon, b.name));
      return el("div.badge", {}, [disc, el("div.badge__name", { text: b.name })]);
    }),
  ]);
  layer.appendChild(badgeRow);

  /* ---- 하단: 처음으로(확인 모달) / 결과 다시보기 / 다시 탐험 ---- */
  layer.appendChild(el("div.row", { style: { ...pos(40, 662, 1200), gap: "12px", justifyContent: "center", zIndex: 8 } }, [
    button("처음으로", { variant: "ghost", icon: "⌂", onClick: () => confirmGoMain() }),
    button("독도 영상관", { variant: "ghost", icon: "🎬", onClick: openTheater }),
    button("다시 탐험하기", { variant: "gold", icon: "🔄", onClick: () => {
      const m = modal(ctx.stage, {
        title: "다시 탐험할까요?", icon: "🔄",
        bodyHtml: "탐사 기록을 초기화하고 처음부터 새로 시작해요.",
        buttons: [
          button("취소", { variant: "ghost", onClick: () => m.close() }),
          button("새로 시작", { variant: "green", onClick: () => { save.reset(); m.close(); toast(ctx.stage, "탐사 기록을 초기화했어요!"); setTimeout(() => ctx.navigate("main"), 600); } }),
        ],
      });
    } }),
  ]));

  /* ---- 전체창 확대 3D 뷰어 (줌인·줌아웃 자세히) ---- */
  function openBigViewer() {
    const big = createDokdoGlbDiorama({ width: 980, height: 520, minDistance: 2.2, maxDistance: 16 });
    const body = el("div", { style: { position: "relative", background: "linear-gradient(180deg,#dcedfa,#c3ddf1)", borderRadius: "14px", overflow: "hidden" } }, [
      big.el,
      el("div", { style: { position: "absolute", left: "0", right: "0", bottom: "8px", textAlign: "center", fontSize: "13px", fontWeight: "800", color: "var(--navy)", opacity: ".8", pointerEvents: "none" },
        text: "드래그 회전 · 휠/두 손가락 줌 — 접안시설과 등대까지 찾아봐요!" }),
    ]);
    const m = modal(ctx.stage, {
      title: "독도 전시 모형 — 자세히 보기", icon: "🏝",
      body,
      buttons: [button("닫기", { variant: "green", onClick: () => { big.stage.dispose(); m.close(); } })],
    });
    m.el.querySelector(".modal").style.maxWidth = "1060px";
    m.el.addEventListener("pointerdown", (e) => { if (e.target === m.el) big.stage.dispose(); }); // 바깥 탭 닫기 시에도 해제
  }

  /* ---- 독도 영상관: 외교부 공식 영상 (유튜브 임베드, 눌러야 재생) ---- */
  const THEATER = [
    { id: "muB4_LNZ2Rk", title: "대한민국의 아름다운 영토, 독도", desc: "외교부 공식 홍보 영상 — 하늘에서 본 독도의 웅장한 모습" },
    { id: "_3cAJCnvRqU", title: "울릉도, 독도로 가는 길", desc: "울릉도에서 독도까지, 우리가 복원한 그 항로를 실제 영상으로" },
  ];
  function openTheater() {
    const body = el("div.col", { style: { gap: "10px", minWidth: "480px" } }, [
      el("div", { style: { fontSize: "14px", fontWeight: "700", color: "var(--ink-soft)", wordBreak: "keep-all" },
        text: "외교부 공식 영상이에요. 선생님과 함께 봐요! (재생 버튼을 누르면 유튜브에서 불러와요)" }),
      ...THEATER.map((v) => el("button", {
        type: "button",
        style: { fontFamily: "inherit", textAlign: "left", display: "flex", flexDirection: "column", gap: "3px",
          background: "#fff", border: "1.5px solid rgba(31,122,194,.3)", borderRadius: "12px",
          padding: "12px 14px", cursor: "pointer", minHeight: "56px" },
        onClick: () => { md.close(); playVideo(v); },
      }, [
        el("span", { style: { fontSize: "15.5px", fontWeight: "900", color: "var(--navy)" }, text: "▶ " + v.title }),
        el("span", { style: { fontSize: "13px", fontWeight: "700", color: "var(--ink-soft)", wordBreak: "keep-all" }, text: v.desc }),
      ])),
      el("div", { style: { fontSize: "12px", fontWeight: "600", color: "var(--ink-soft)" },
        html: `출처: <a href="https://dokdo.mofa.go.kr/kor/pds/video_list.jsp" target="_blank" rel="noopener" style="color:var(--sea-deep)">외교부 독도 동영상</a>` }),
    ]);
    const md = modal(ctx.stage, { title: "독도 영상관", icon: "🎬", body,
      buttons: [button("닫기", { variant: "ghost", onClick: () => md.close() })] });
  }
  function playVideo(v) {
    // 영상 재생 중에는 배경음·효과음 정지, 닫으면 원래대로
    const prevBgm = AudioManager.bgmEnabled, prevSfx = AudioManager.sfxEnabled;
    AudioManager.setBgmEnabled(false);
    AudioManager.setSfxEnabled(false);
    let restored = false;
    const restore = () => { if (restored) return; restored = true; AudioManager.setBgmEnabled(prevBgm); AudioManager.setSfxEnabled(prevSfx); };
    const frame = document.createElement("iframe");
    frame.src = `https://www.youtube-nocookie.com/embed/${v.id}?rel=0`;
    frame.allow = "accelerometer; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    Object.assign(frame.style, { width: "100%", aspectRatio: "16 / 9", height: "auto", border: "0", borderRadius: "12px", background: "#000", display: "block" });
    const md = modal(ctx.stage, {
      title: v.title, icon: "🎬",
      body: el("div", {}, [frame]),
      buttons: [button("영상 닫기", { variant: "green", onClick: () => { restore(); md.close(); } })],
    });
    // 영상이 잘리지 않게 모달 너비를 명시 (기본 max-width 720에선 패딩만큼 부족)
    Object.assign(md.el.querySelector(".modal").style, { width: "790px", maxWidth: "94%" });
    // ESC 등 다른 경로로 닫혀도 소리 복구
    const guard = setInterval(() => { if (!md.el.isConnected) { restore(); clearInterval(guard); } }, 800);
  }

  /* ---- 모달: 처음으로 확인 (진행 데이터 유지 안내) ---- */
  function confirmGoMain() {
    const m = modal(ctx.stage, {
      title: "메인 화면으로 갈까요?", icon: "⌂",
      bodyHtml: "지금까지의 탐사 기록은 그대로 저장돼 있어요.<br>언제든 다시 돌아올 수 있어요!",
      buttons: [
        button("취소", { variant: "ghost", onClick: () => m.close() }),
        button("메인으로", { variant: "green", onClick: () => { m.close(); ctx.navigate("main"); } }),
      ],
    });
  }

  /* ---- 모달: 탐사 결과 다시보기 (저장값이 없어도 "—"로 안전 표시) ---- */
  function openReviewModal() {
    const board = save.get("briefingBoard") || {};
    const draft = save.get("presentationDraft") || {};
    const refl = save.get("reflection") || {};
    const memo = (refl.memorable && typeof refl.memorable === "object") ? refl.memorable : {};

    const secTitle = (t) => el("div", { style: { fontSize: "17px", fontWeight: "900", color: "var(--sea-deep)" }, text: t });
    const line = (k, v, color) => el("div.row", { style: { gap: "8px", alignItems: "baseline", fontSize: "15px" } }, [
      el("span", { style: { fontWeight: "800", color: color || "var(--navy)", flex: "0 0 auto" }, text: k }),
      el("span", { style: { fontWeight: "600", color: "var(--ink)", wordBreak: "keep-all" }, text: v }),
    ]);

    const boardRows = BRIEFING_FIELDS.map((f) => line(`${f.icon} ${f.label}`, cardLabelOf(board[f.key]) || "—", f.color));

    const orderIds = Array.isArray(draft.orderedSections) ? draft.orderedSections : [];
    const orderRows = orderIds.length
      ? orderIds.map((id, i) => el("div", { style: { fontSize: "15px", fontWeight: "700", color: "var(--ink)" }, text: `${i + 1}. ${sectionLabelOf(id) || "—"}` }))
      : [el("div", { style: { fontSize: "15px", fontWeight: "600", color: "var(--ink-soft)" }, text: "아직 발표 순서를 정하지 않았어요." })];

    const pledgeText = (typeof refl.pledge === "string" && refl.pledge.trim()) ? refl.pledge : "아직 적지 않았어요.";
    const mf = fieldOf(memo.field);
    const memoText = mf ? `${mf.icon} ${mf.label} — ${typeof memo.sentence === "string" ? memo.sentence : ""}` : "아직 고르지 않았어요.";

    const body = el("div.col", { style: { gap: "14px", maxHeight: "380px", overflowY: "auto", paddingRight: "6px" } }, [
      el("div.col", { style: { gap: "6px" } }, [secTitle("📌 브리핑 보드에 붙인 근거"), ...boardRows]),
      el("div.col", { style: { gap: "6px" } }, [secTitle("🎤 발표 순서"), ...orderRows]),
      el("div.col", { style: { gap: "6px" } }, [secTitle("🌿 나의 보호 다짐"),
        el("div", { style: { fontSize: "15px", fontWeight: "600", color: "var(--ink)", lineHeight: "1.5", wordBreak: "keep-all" }, text: pledgeText })]),
      el("div.col", { style: { gap: "6px" } }, [secTitle("💭 가장 기억에 남는 근거"),
        el("div", { style: { fontSize: "15px", fontWeight: "600", color: "var(--ink)", lineHeight: "1.5", wordBreak: "keep-all" }, text: memoText })]),
    ]);

    const m = modal(ctx.stage, {
      title: "탐사 결과 다시보기", icon: "📋", body,
      buttons: [button("닫기", { variant: "ghost", onClick: () => m.close() })],
    });
  }

  /* ---- 모달: 수료증 저장 (반·번호 입력 → 수료증 PNG 다운로드) ---- */
  function openCertSaveModal() {
    const cert = save.get("certificate") || {};
    const inputStyle = {
      width: "76px", fontFamily: "inherit", fontSize: "17px", fontWeight: "800",
      textAlign: "center", color: "var(--ink)", background: "#fff",
      border: "2px solid #b9c7d6", borderRadius: "10px", padding: "9px 6px", outline: "none",
    };
    const mkNum = (v, ph) => {
      const i = el("input", { type: "text", attrs: { inputmode: "numeric", maxlength: "2", placeholder: ph }, style: inputStyle });
      i.value = v || "";
      return i;
    };
    const inGrade = mkNum(cert.grade, "4");
    const inClass = mkNum(cert.classNo, "1");
    const inNum = mkNum(cert.studentNo, "1");
    const body = el("div.col", { style: { gap: "12px", minWidth: "400px" } }, [
      el("div", { style: { fontSize: "15px", fontWeight: "700", color: "var(--ink)", wordBreak: "keep-all", lineHeight: "1.5" },
        text: "학년·반·번호를 적으면 수료증 그림 파일로 저장해요. (이름은 적지 않아요 · 이 기기에만 저장)" }),
      el("div.row", { style: { alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "17px", fontWeight: "800", color: "var(--navy)" } }, [
        inGrade, el("span", { text: "학년" }), inClass, el("span", { text: "반" }), inNum, el("span", { text: "번" }),
      ]),
    ]);
    const m = modal(ctx.stage, {
      title: "수료증 저장", icon: "🖼", body,
      buttons: [
        button("취소", { variant: "ghost", onClick: () => m.close() }),
        button("수료증 그림 저장", { variant: "gold", onClick: async () => {
          const c = { grade: inGrade.value.trim(), classNo: inClass.value.trim(), studentNo: inNum.value.trim() };
          save.set("certificate", c);
          m.close();
          try {
            await downloadCertificate(c);
            toast(ctx.stage, "수료증을 저장했어요! 다운로드 폴더를 확인해요.");
          } catch (e) {
            console.warn("[cert] 저장 실패:", e);
            toast(ctx.stage, "저장이 안 되면 화면을 캡처해서 선생님께 보여 드려요.");
          }
        } }),
      ],
    });
  }

  /** 수료증을 canvas 에 직접 그려 PNG 다운로드
      cert_frame.png 은 중앙까지 그려진 완성형 배경(1672×941) — 먼저 깔고 텍스트를 위에 쓴다 */
  async function downloadCertificate(c) {
    const W = 1672, H = 941; // cert_frame 원본 비율 그대로
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d");

    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    const [badge, frame] = await Promise.all([load(DOKDO.badgeFinal), load(DOKDO.certFrame)]);

    if (frame) g.drawImage(frame, 0, 0, W, H);
    else { // 프레임 로딩 실패 시 양피지 그라데이션 폴백
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#fffdf6"); grad.addColorStop(1, "#f6efdb");
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
    }

    if (badge) g.drawImage(badge, W / 2 - 102, 112, 204, 204);
    g.fillStyle = "#14365c"; g.textAlign = "center";
    g.font = "900 61px 'Malgun Gothic', sans-serif";
    g.fillText("독도 탐사본부 수료증", W / 2, 400);
    g.font = "700 33px 'Malgun Gothic', sans-serif";
    g.fillStyle = "#5b6b7c";
    const who = (c.grade ? `${c.grade}학년 ` : "") + (c.classNo ? `${c.classNo}반 ` : "") + (c.studentNo ? `${c.studentNo}번 ` : "") + "탐사대원";
    g.fillText(who, W / 2, 464);
    g.fillStyle = "#2b3a4a";
    g.font = "700 27px 'Malgun Gothic', sans-serif";
    g.fillText("위 대원은 독도의 위치·지형·역사·생태·보호 다섯 영역의 근거를", W / 2, 537);
    g.fillText("스스로 수집하여 탐사 임무를 완수하였기에 이 증서를 수여합니다.", W / 2, 580);
    g.fillStyle = "#1d6b2e";
    g.font = "800 29px 'Malgun Gothic', sans-serif";
    g.fillText("“독도는 역사·지리·국제법적으로 명백한 대한민국의 영토입니다.”", W / 2, 660);
    const d = new Date();
    g.fillStyle = "#5b6b7c";
    g.font = "700 26px 'Malgun Gothic', sans-serif";
    g.fillText(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 · 독도 탐사본부`, W / 2, 748);

    const a = document.createElement("a");
    a.download = `독도탐사수료증${c.grade ? "_" + c.grade + "-" + c.classNo + "-" + c.studentNo : ""}.png`;
    a.href = cv.toDataURL("image/png");
    a.click();
  }

  return root;
}
