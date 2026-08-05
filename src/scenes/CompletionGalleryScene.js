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
import { ICONS, DOKDO } from "../config/assetManifest.js";
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
    button("결과 남기기", { variant: "ghost", size: "sm", icon: "📸", onClick: openCaptureModal }),
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
      const img = assetImg(DOKDO.islandModel, "독도 전시 모형");
      Object.assign(img.style, { width: "86%", height: "86%", objectFit: "contain" });
      img.classList.add("floaty");
      holder.appendChild(img);
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
      el("div", { style: { fontSize: "17px", fontWeight: "800", color: "var(--green-deep)", lineHeight: "1.45", wordBreak: "keep-all" },
        text: "“독도는 위치, 지형, 역사, 자연이 모두 소중한 우리 땅입니다.”" }),
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

  /* ---- 우측: 탐사 노트(토글) ---- */
  layer.appendChild(collapsible({
    title: "탐사 노트", icon: "📖", variant: "light",
    style: { ...pos(985, 96, 280), zIndex: 10 },
    body: [el("div.col", { style: { gap: "6px" } }, MISSIONS.filter((m) => m.evidenceField).map((m) =>
      el("div.row", { style: { gap: "8px", fontSize: "15px", fontWeight: "700", color: "var(--navy)" } }, [
        el("span", { text: save.isCompleted(m.key) ? "✅" : "🔒" }), el("span", { text: m.title }),
      ])))],
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

  /* ---- 모달: 결과 남기기 (화면 캡처 + 교사 확인 안내, 서버 없음 전제) ---- */
  function openCaptureModal() {
    const row = (icon, txt) => el("div.row", { style: { gap: "8px", alignItems: "flex-start", fontSize: "15.5px", fontWeight: "600", color: "var(--ink)", lineHeight: "1.5" } }, [
      el("span", { style: { flex: "0 0 auto" }, text: icon }),
      el("span", { style: { wordBreak: "keep-all" }, text: txt }),
    ]);
    const body = el("div.col", { style: { gap: "10px" } }, [
      el("div", { style: { fontSize: "16px", fontWeight: "800", color: "var(--navy)", wordBreak: "keep-all" }, text: "이 화면을 캡처해서 나의 탐사 결과를 남겨요." }),
      row("📱", "태블릿: 전원 버튼과 소리 줄이기 버튼을 동시에 짧게 눌러요."),
      row("🖐️", "일부 태블릿은 손날로 화면을 옆으로 쓸어도 캡처돼요."),
      row("🧑‍🏫", "캡처한 화면을 선생님께 보여 드리고 탐사 수료를 확인받아요."),
      el("div", { style: { fontSize: "13.5px", fontWeight: "600", color: "var(--ink-soft)", wordBreak: "keep-all" }, text: "탐사 기록은 이 기기(브라우저)에 자동으로 저장돼 있어요." }),
    ]);
    const m = modal(ctx.stage, {
      title: "결과 남기기", icon: "📸", body,
      buttons: [button("확인", { variant: "green", onClick: () => m.close() })],
    });
  }

  return root;
}
