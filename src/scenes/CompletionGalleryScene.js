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
import { supportsWebGL } from "../components/three/ThreeStage.js";
import { createDokdoDiorama3D } from "../components/three/DokdoDiorama3D.js";
import PAGES from "../config/pageConfig.js";
import { MISSIONS, BRIEFING_FIELDS, isAllComplete } from "../data/missions.js";
import { BRIEFING_CARDS, PRESENTATION_ORDER } from "../data/questions.js";
/* 3D 디오라마는 이후 단계에서 복구 예정 (_recovered/ 참고) */

/* ---- 데이터 라벨 헬퍼 (저장값이 없거나 낡아도 "—"로 안전하게) ---- */
function cardLabelOf(cardId) {
  const c = BRIEFING_CARDS.find((x) => x.id === cardId);
  return c ? c.label.replace(/\n/g, " ") : null;
}
function sectionLabelOf(sectionId) {
  const s = PRESENTATION_ORDER.sections.find((x) => x.id === sectionId);
  return s ? s.label : null;
}
function fieldOf(fieldKey) {
  return BRIEFING_FIELDS.find((f) => f.key === fieldKey) || null;
}

/* ---- 입력 UI 헬퍼 (인라인 스타일 — main.css 불변 원칙) ---- */
function makeTextarea({ maxLen, rows, placeholder, value }) {
  const ta = el("textarea", {
    rows: String(rows), maxlength: String(maxLen), placeholder,
    style: {
      width: "100%", boxSizing: "border-box", fontFamily: "inherit",
      fontSize: "15px", fontWeight: "600", lineHeight: "1.5", color: "var(--ink)",
      background: "#fff", border: "2px solid #b9c7d6", borderRadius: "10px",
      padding: "8px 10px", resize: "none", outline: "none",
    },
  });
  ta.value = value || "";
  return ta;
}
function counterFor(ta, maxLen) {
  const c = el("div", { style: { fontSize: "12.5px", fontWeight: "700", color: "var(--ink-soft)", textAlign: "right" } });
  const update = () => { c.textContent = `${ta.value.length} / ${maxLen}자`; };
  ta.addEventListener("input", update);
  update();
  return c;
}

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

  // 저장된 다짐/성찰 복원 (없거나 깨져 있어도 기본값으로)
  const reflection = save.get("reflection") || {};
  const savedPledge = typeof reflection.pledge === "string" ? reflection.pledge : "";
  const savedMemo = (reflection.memorable && typeof reflection.memorable === "object") ? reflection.memorable : {};

  /* ---- 상단: 이전 / 명패 / 결과 남기기 / 홈 ---- */
  layer.appendChild(el("div.row", { style: { ...pos(22, 20), gap: "12px", zIndex: 12 } }, [
    backButton(() => ctx.navigate("missionMap")),
  ]));
  sign(layer, DOKDO.signComplete, { x: 108, y: -14, w: 175, h: 175, alt: "탐사 수료관" });
  layer.appendChild(el("div.row", { style: { ...pos(920, 20, 340), gap: "10px", zIndex: 12, justifyContent: "flex-end", alignItems: "center" } }, [
    button("수료증 저장", { variant: "gold", size: "sm", icon: "🖼", onClick: openCertSaveModal }),
    homeButton(() => confirmGoMain()),
  ]));

  /* ---- 장식 + 축하 캐릭터 ---- */
  placeAsset(layer, ICONS.bunting, { x: 360, y: 46, w: 560, h: 110, alt: "축하 장식", z: 3 });
  placeAsset(layer, DOKDO.girlScout, { x: 900, y: 335, w: 245, h: 335, alt: "축하하는 탐험가 소녀", z: 5 });

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
      let dio = null;
      if (supportsWebGL()) dio = createDokdoDiorama3D({ root, width: 308, height: 260 });
      if (dio) {
        holder.appendChild(dio.el);
        holder.appendChild(el("div", {
          style: { position: "absolute", left: "0", right: "0", bottom: "6px", textAlign: "center", fontSize: "12.5px", fontWeight: "800", color: "var(--navy)", opacity: ".75", pointerEvents: "none" },
          text: "손가락으로 돌려서 살펴봐요",
        }));
      } else {
        const img = assetImg(DOKDO.islandModel, "독도 전시 모형");
        Object.assign(img.style, { width: "86%", height: "86%", objectFit: "contain" });
        img.classList.add("floaty");
        holder.appendChild(img);
      }
      return holder;
    })(),
  ]));
  placeAsset(layer, DOKDO.boyScout, { x: 822, y: 408, w: 180, h: 250, alt: "축하하는 탐험가 소년", z: 4 });

  /* ---- 중앙 수료증(CSS) + 수료 배지(이미지) ---- */
  const cert = el("div.panel.panel--parchment", { style: { ...pos(390, 150, 500), zIndex: 4, textAlign: "center", padding: "0", border: "4px solid var(--gold-deep)" } }, [
    el("div", { style: { padding: "20px 30px 24px" } }, [
      (() => {
        const w = el("div", { style: { width: "110px", height: "110px", margin: "0 auto" } });
        const img = assetImg(DOKDO.badgeFinal, "수료 배지");
        Object.assign(img.style, { width: "100%", height: "100%", objectFit: "contain" });
        w.appendChild(img);
        return w;
      })(),
      el("div", { style: { fontSize: "30px", fontWeight: "900", color: "var(--navy)", margin: "6px 0" }, text: "독도 탐사본부 수료" }),
      el("div", { style: { fontSize: "15px", color: "var(--ink-soft)", fontWeight: "700" }, text: "위치 · 지형 · 역사 · 생태 · 보호 미션 완료" }),
      el("div", { style: { margin: "12px auto", width: "60%", height: "2px", background: "var(--gold-deep)" } }),
      el("div", { style: { fontSize: "17px", fontWeight: "800", color: "var(--green-deep)", lineHeight: "1.5", wordBreak: "keep-all" },
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

  /* ---- 좌측: 나의 보호 다짐(토글 → 직접 입력) ---- */
  const pledgeTa = makeTextarea({
    maxLen: 80, rows: 3,
    placeholder: "예) 독도를 바르게 알리고, 자연을 관찰하되 해치지 않으며, 쓰레기는 되가져가겠습니다.",
    value: savedPledge,
  });
  layer.appendChild(collapsible({
    title: "나의 보호 다짐", icon: "🌿",
    style: { ...pos(22, 96, 300), zIndex: 10 },
    body: [el("div.col", { style: { gap: "6px" } }, [
      el("div", { style: { fontSize: "14px", fontWeight: "700", color: "var(--navy)", wordBreak: "keep-all" }, text: "독도를 지키기 위한 나만의 다짐을 한 문장으로 적어요." }),
      pledgeTa,
      counterFor(pledgeTa, 80),
      el("div.row", { style: { justifyContent: "flex-end" } }, [
        button("다짐 저장", { variant: "green", size: "sm", icon: "💾", onClick: () => {
          const text = pledgeTa.value.trim().slice(0, 80);
          if (!text) { toast(ctx.stage, "다짐을 한 문장 적은 뒤 저장해요!"); return; }
          save.setReflection({ pledge: text });
          toast(ctx.stage, "나의 보호 다짐을 저장했어요!");
        } }),
      ]),
    ])],
  }));

  /* ---- 우측: 오늘의 독도(토글) — 실사 + 정보 카드 ---- */
  layer.appendChild(collapsible({
    title: "오늘의 독도", icon: "🗼", variant: "light",
    style: { ...pos(985, 96, 280), zIndex: 10 },
    body: [el("div.col", { style: { gap: "7px" } }, [
      (() => {
        const ph = assetImg(PHOTOS.boat, "오늘의 독도");
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
  const chips = BRIEFING_FIELDS.map((f) => {
    const node = el("button", {
      type: "button",
      style: {
        padding: "5px 10px", borderRadius: "999px", border: "2px solid " + f.color,
        background: "#fff", color: f.color, fontWeight: "800", fontSize: "13.5px",
        cursor: "pointer", fontFamily: "inherit", lineHeight: "1.3",
      },
      text: f.icon + " " + f.label,
      onClick: () => { memoField = f.key; paintChips(); },
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
  const memoTa = makeTextarea({
    maxLen: 60, rows: 2,
    placeholder: "예) 옛 기록에 독도가 우리 땅이라고 적혀 있어서예요.",
    value: typeof savedMemo.sentence === "string" ? savedMemo.sentence : "",
  });
  layer.appendChild(collapsible({
    title: "마무리 성찰 카드", icon: "💭", variant: "gold",
    style: { ...pos(985, 152, 280), zIndex: 9 },
    body: [el("div.col", { style: { gap: "8px" } }, [
      el("div", { style: { fontSize: "14px", fontWeight: "700", color: "var(--navy)", wordBreak: "keep-all" }, text: "가장 기억에 남는 근거 영역을 고르고, 그 까닭을 적어요." }),
      el("div.row", { style: { gap: "6px", flexWrap: "wrap" } }, chips.map((c) => c.node)),
      memoTa,
      counterFor(memoTa, 60),
      el("div.row", { style: { justifyContent: "flex-end" } }, [
        button("성찰 저장", { variant: "green", size: "sm", icon: "💾", onClick: () => {
          if (!memoField) { toast(ctx.stage, "기억에 남는 영역을 먼저 골라요!"); return; }
          const sentence = memoTa.value.trim().slice(0, 60);
          if (!sentence) { toast(ctx.stage, "그 까닭을 한 문장으로 적어 봐요!"); return; }
          save.setReflection({ memorable: { field: memoField, sentence } });
          toast(ctx.stage, "마무리 성찰을 저장했어요!");
        } }),
      ]),
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
    button("탐사 결과 다시보기", { icon: "📋", onClick: openReviewModal }),
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
    const frame = document.createElement("iframe");
    frame.src = `https://www.youtube-nocookie.com/embed/${v.id}?rel=0`;
    frame.allow = "accelerometer; encrypted-media; picture-in-picture; fullscreen";
    frame.allowFullscreen = true;
    Object.assign(frame.style, { width: "720px", height: "405px", border: "0", borderRadius: "12px", background: "#000", display: "block" });
    const md = modal(ctx.stage, {
      title: v.title, icon: "🎬",
      body: el("div", {}, [frame]),
      buttons: [button("영상 닫기", { variant: "green", onClick: () => md.close() })],
    });
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

  /** 수료증을 canvas 에 직접 그려 PNG 다운로드 (생성 프레임 합성) */
  async function downloadCertificate(c) {
    const W = 1200, H = 800; // cert_frame 비율(3:2)
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    const g = cv.getContext("2d");
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "#fffdf6"); grad.addColorStop(1, "#f6efdb");
    g.fillStyle = grad; g.fillRect(0, 0, W, H);

    const load = (src) => new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
    const [badge, frame] = await Promise.all([load(DOKDO.badgeFinal), load(DOKDO.certFrame)]);

    if (badge) g.drawImage(badge, W / 2 - 88, 96, 176, 176);
    g.fillStyle = "#14365c"; g.textAlign = "center";
    g.font = "900 52px 'Malgun Gothic', sans-serif";
    g.fillText("독도 탐사본부 수료증", W / 2, 340);
    g.font = "700 28px 'Malgun Gothic', sans-serif";
    g.fillStyle = "#5b6b7c";
    const who = (c.grade ? `${c.grade}학년 ` : "") + (c.classNo ? `${c.classNo}반 ` : "") + (c.studentNo ? `${c.studentNo}번 ` : "") + "탐사대원";
    g.fillText(who, W / 2, 394);
    g.fillStyle = "#2b3a4a";
    g.font = "700 23px 'Malgun Gothic', sans-serif";
    g.fillText("위 대원은 독도의 위치·지형·역사·생태·보호 다섯 영역의 근거를", W / 2, 456);
    g.fillText("스스로 수집하여 탐사 임무를 완수하였기에 이 증서를 수여합니다.", W / 2, 492);
    g.fillStyle = "#1d6b2e";
    g.font = "800 25px 'Malgun Gothic', sans-serif";
    g.fillText("“독도는 역사·지리·국제법적으로 명백한 대한민국의 영토입니다.”", W / 2, 560);
    const d = new Date();
    g.fillStyle = "#5b6b7c";
    g.font = "700 22px 'Malgun Gothic', sans-serif";
    g.fillText(`${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 · 독도 탐사본부`, W / 2, 636);
    if (frame) g.drawImage(frame, 0, 0, W, H); // 장식 프레임을 맨 위에 합성

    const a = document.createElement("a");
    a.download = `독도탐사수료증${c.grade ? "_" + c.grade + "-" + c.classNo + "-" + c.studentNo : ""}.png`;
    a.href = cv.toDataURL("image/png");
    a.click();
  }

  return root;
}
