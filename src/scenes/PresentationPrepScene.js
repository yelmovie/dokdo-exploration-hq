/* =========================================================================
   9페이지 - 최종 발표 준비 (PresentationPrepScene) (샘플 9 대응)
   활동 3단계: 발표 순서 정렬 → 발표문 빈칸 채우기(+나의 마무리 문장)
   → 문장 개선. 마지막에 전체 발표문 미리보기(발표 연습) 후 완료.
   요약/가이드는 토글 수납. 빈칸 선택·입력은 presentationDraft에 자동 저장.
   ========================================================================= */
import { el } from "../core/dom.js";
import { buildScene, placeAsset, quiz, pos, collapsible, modal, button, pillHead, speech } from "../components/ui.js";
import { orderInteraction } from "../components/interactions.js";
import { missionFrame, nextCoachButton, completeMission } from "./_shared.js";
import { DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { PRESENTATION_ORDER, PRESENTATION_FIX } from "../data/questions.js";
import AudioManager from "../managers/AudioManager.js";
import stats from "../managers/StatsManager.js";

const STAGE_TITLES = [
  "발표 순서를 <b>나만의 방식</b>으로 정하세요 — 정답은 없어요",
  "발표문 빈칸에 <b>알맞은 근거</b>를 채우세요",
  "감상만 있는 문장을 <b>근거 있는 발표 문장</b>으로 고쳐 보세요",
];

/* 발표문 빈칸 템플릿 — 탐사에서 모은 5개 영역 근거로 채운다(오답 재도전) */
const SCRIPT_BLANKS = [
  { id: "loc", section: "📍 위치", before: "독도는 울릉도에서 ", after: " 에 있는 우리 영토입니다.",
    options: ["동쪽 약 87.4km", "서쪽 바로 옆", "남쪽 아주 먼 바다"], answer: 0 },
  { id: "geo", section: "⛰️ 지형", before: "독도는 ", after: " 지형이라 평지가 좁습니다.",
    options: ["넓은 모래 해변", "가파른 바위", "낮고 축축한 늪"], answer: 1 },
  { id: "his", section: "📜 역사", before: "옛 기록과 ", after: " 는 독도가 우리 땅임을 보여 줍니다.",
    options: ["새로 만든 광고", "재미있는 전설", "대한제국 칙령 제41호"], answer: 2 },
  { id: "eco", section: "🌿 생태", before: "독도에는 ", after: " 이 살아 자연이 소중합니다.",
    options: ["괭이갈매기와 야생화", "북극곰과 펭귄", "야자나무 숲"], answer: 0 },
  { id: "pro", section: "🛡️ 보호", before: "우리는 ", after: " 하며 독도를 지킬 수 있습니다.",
    options: ["꽃을 꺾어 기념", "정해진 길로 조용히 관찰", "큰 소리로 새 부르기"], answer: 1 },
];
const CLOSING_MAX = 60;

export default function PresentationPrepScene(ctx) {
  const cfg = PAGES.presentation;
  const { root, layer } = buildScene({ bg: cfg.bg }); // 무대 배경 그대로 (베일 없음)
  let stage = 0;

  const frame = missionFrame(ctx, layer, cfg, {
    signSrc: DOKDO.signPresent,
    helpText: "인사→소개→중요 내용→보호→마무리 순서로, 근거를 넣어 발표해요.",
  });

  /* ---- 저장된 초안 불러오기 (없으면 기본값) ---- */
  const draft = ctx.save.get("presentationDraft") || {};
  const savedSentences = draft.sentences || {};
  const picks = { ...(savedSentences.blanks || {}) }; // blankId -> 선택 index
  let closing = savedSentences.closing || "";

  function saveDraft() {
    const cur = ctx.save.get("presentationDraft") || {};
    ctx.save.set("presentationDraft", {
      ...cur,
      sentences: { ...(cur.sentences || {}), blanks: { ...picks }, closing },
    });
  }

  /* ---- 좌상단: 탐구 요약(토글, 기본 접힘 — 저장 데이터 기반) ---- */
  const board = ctx.save.get("briefingBoard");
  const summaryRows = [
    ["📍", "조사한 섬", "독도"],
    ["🗺️", "위치 특징", board.location ? "울릉도의 동쪽 바다" : "—"],
    ["⛰️", "지형 특징", board.geology ? "동도와 서도를 중심으로 이루어짐" : "—"],
    ["📜", "역사 인물", board.history ? "안용복" : "—"],
    ["🌿", "자연 보호", board.protection ? "표시된 길을 따라 조용히 관찰하기" : "—"],
  ];
  layer.appendChild(collapsible({
    title: "탐구 요약", icon: "📋",
    style: { ...pos(22, 96), zIndex: 9 },
    body: [el("div.col", { style: { gap: "2px" } }, summaryRows.map((r) =>
      el("div.row", { style: { gap: "8px", alignItems: "center", padding: "8px 2px", borderBottom: "1px dashed var(--panel-line)" } }, [
        el("span", { style: { fontSize: "18px", width: "26px" }, text: r[0] }),
        el("span", { style: { width: "80px", fontWeight: "700", color: "var(--ink-soft)", fontSize: "13px" }, text: r[1] }),
        el("span", { style: { flex: "1", fontWeight: "800", color: "var(--navy)", fontSize: "14px" }, text: r[2] }),
      ])))],
  }));

  /* ---- 좌하단: 발표 구성 가이드(토글, 기본 접힘) ---- */
  layer.appendChild(collapsible({
    title: "발표 구성 가이드", icon: "🗣️", variant: "gold",
    style: { ...pos(22, 160), zIndex: 8 },
    body: PRESENTATION_ORDER.sections.map((s, i) =>
      el("div.row", { style: { gap: "10px", alignItems: "flex-start", margin: "7px 0" } }, [
        el("span", { style: { width: "26px", height: "26px", flex: "0 0 auto", borderRadius: "50%", background: "var(--sea)", color: "#fff", fontWeight: "900", fontSize: "14px", display: "flex", alignItems: "center", justifyContent: "center" }, text: String(i + 1) }),
        el("div", {}, [
          el("div", { style: { fontWeight: "900", fontSize: "14px", color: "var(--navy)" }, text: s.label }),
          el("div", { style: { fontWeight: "600", fontSize: "13px", color: "var(--ink-soft)", lineHeight: "1.35" }, text: s.desc }),
        ]),
      ])),
  }));

  /* ---- 캐릭터: 발표 소녀(무대 좌측) ---- */
  // 무대 바닥(화분 라인 y≈500)에 발이 닿게 — 다리가 무대 아래로 잘리지 않는 크기
  placeAsset(layer, DOKDO.presenterGirl, { x: 44, y: 226, w: 196, h: 275, alt: "발표 준비 탐험가", z: 3, shadow: true });
  speech(layer, { x: 198, y: 146, text: "무대 스크린에 나만의 발표를 완성해 보자!", tail: "left", width: 185 });

  /* ---- 중앙: 활동 보드 (배경 무대의 스크린 위에) ---- */
  const boardEl = el("div.q-board", { style: { ...pos(352, 92, 600, 556) } }, [el("div.q-board__clip")]);
  boardEl.style.background = "rgba(252, 254, 255, .62)";
  const qTitle = el("div.q-board__title");
  const qHolder = el("div", { style: { flex: "1", overflowY: "auto", paddingRight: "4px" } });
  const nextHolder = el("div.row", { style: { justifyContent: "flex-end", minHeight: "0" } });
  boardEl.appendChild(qTitle); boardEl.appendChild(qHolder); boardEl.appendChild(nextHolder);
  layer.appendChild(boardEl);

  /* ---- 2단계: 발표문 빈칸 채우기 + 나의 마무리 문장 ---- */
  function renderScriptEditor() {
    const fb = el("div.feedback");
    /* 빈칸 클릭 → 선택지 3개가 펼쳐지는 팝오버에서 고르기 */
    function closePops() { qHolder.querySelectorAll(".blank-pop").forEach((p) => p.remove()); }
    const rows = SCRIPT_BLANKS.map((b) => {
      const blankSpan = el("span", {
        style: { display: "inline-block", minWidth: "170px", padding: "2px 12px", margin: "0 4px",
          borderRadius: "10px", border: "2px dashed var(--gold-deep)", background: "#fff",
          cursor: "pointer", textAlign: "center", color: picks[b.id] != null ? "var(--sea-deep)" : "#8a97a5", fontWeight: "800" },
        text: picks[b.id] != null ? b.options[picks[b.id]] : "눌러서 고르기",
      });
      const row = el("div", { style: { position: "relative", padding: "9px 12px", background: "rgba(253,249,239,.85)", border: "1px solid var(--panel-line)", borderRadius: "12px", fontSize: "16px", fontWeight: "700", color: "var(--ink)", lineHeight: "1.7" } }, [
        el("span", { style: { display: "inline-block", minWidth: "74px", fontWeight: "900", color: "var(--navy)", fontSize: "14px" }, text: b.section }),
        el("span", { text: b.before }), blankSpan, el("span", { text: b.after }),
      ]);
      blankSpan.addEventListener("click", (e) => {
        e.stopPropagation();
        AudioManager.unlock(); AudioManager.click();
        const opened = row.querySelector(".blank-pop");
        closePops();
        if (opened) return; // 다시 누르면 닫기
        const pop = el("div.blank-pop", { style: { left: "86px", top: "calc(100% - 4px)" } },
          b.options.map((opt, oi) => {
            const ob = el("button", { type: "button", text: opt });
            if (picks[b.id] === oi) { ob.style.borderColor = "var(--sea)"; ob.style.background = "#eaf4fd"; }
            ob.addEventListener("click", () => {
              picks[b.id] = oi;
              blankSpan.textContent = opt;
              blankSpan.style.color = "var(--sea-deep)";
              blankSpan.style.borderStyle = "solid";
              saveDraft();
              checkBtn.disabled = SCRIPT_BLANKS.some((x) => picks[x.id] == null);
              closePops();
              AudioManager.click();
            });
            return ob;
          }));
        row.appendChild(pop);
      });
      return row;
    });
    qHolder.addEventListener("click", closePops);

    /* 나의 마무리 문장 — 자유 입력, debounce 자동 저장 */
    const counter = el("span", { style: { fontSize: "12px", fontWeight: "700", color: "var(--ink-soft)" }, text: `${closing.length} / ${CLOSING_MAX}자` });
    const ta = el("textarea", {
      style: { width: "100%", minHeight: "54px", resize: "none", borderRadius: "12px", border: "2px solid var(--panel-line)",
        padding: "10px 12px", fontSize: "15px", fontWeight: "700", color: "var(--ink)", fontFamily: "inherit", lineHeight: "1.5" },
      attrs: { maxlength: String(CLOSING_MAX), placeholder: "예) 우리 모두 독도를 바르게 알고 아껴 주세요!" },
    });
    ta.value = closing;
    let debounceTimer = 0;
    ta.addEventListener("input", () => {
      closing = ta.value.slice(0, CLOSING_MAX);
      counter.textContent = `${closing.length} / ${CLOSING_MAX}자`;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(saveDraft, 500); // 자동 저장 debounce
    });

    const checkBtn = button("빈칸 확인하기", { variant: "gold", size: "lg", icon: "🔍", disabled: SCRIPT_BLANKS.some((x) => picks[x.id] == null), onClick: () => {
      const ok = SCRIPT_BLANKS.every((b) => picks[b.id] === b.answer);
      if (!ok) {
        stats.wrong++;
        fb.className = "feedback show feedback--no";
        fb.textContent = "💡 탐사에서 확인한 ‘자료 근거’와 맞는 표현인지 빈칸을 다시 눌러 봐요.";
        AudioManager.wrong();
        return;
      }
      fb.className = "feedback show feedback--ok";
      fb.textContent = "✅ 근거가 탄탄한 발표문이 완성됐어요!";
      AudioManager.correct();
      checkBtn.style.display = "none";
      saveDraft();
      nextHolder.appendChild(nextCoachButton("다음 활동", () => { stage = 2; render(); }));
    } });

    qHolder.appendChild(el("div.col", { style: { gap: "10px" } }, [
      el("div.tip", { html: "<b>‘눌러서 고르기’</b> 칸을 누르면 고를 수 있는 표현 3개가 나와요. 고른 내용은 자동 저장돼요." }),
      ...rows,
      el("div", { style: { marginTop: "4px" } }, [
        el("div.row", { style: { justifyContent: "space-between", alignItems: "center", marginBottom: "6px" } }, [
          pillHead("💬 나의 마무리 한 문장", "gold"), counter,
        ]),
        ta,
      ]),
      fb,
      el("div.row", { style: { justifyContent: "center", marginTop: "4px" } }, [checkBtn]),
    ]));
  }

  /* ---- 발표 연습(전체 발표문 미리보기) → 미션 완료 ---- */
  function openRehearsal() {
    const order = (ctx.save.get("presentationDraft").orderedSections || []).length
      ? ctx.save.get("presentationDraft").orderedSections
      : PRESENTATION_ORDER.answer;
    const bySection = { greeting: "안녕하세요? 지금부터 독도 탐사 결과를 발표하겠습니다." };
    SCRIPT_BLANKS.forEach((b) => {
      const pick = picks[b.id] != null ? b.options[picks[b.id]] : "____";
      bySection[b.id] = b.before + pick + b.after;
    });
    const lines = [];
    order.forEach((id) => {
      const sec = PRESENTATION_ORDER.sections.find((s) => s.id === id);
      const mapped = { intro: "loc", location: "loc", geology: "geo", history: "his", ecology: "eco", protection: "pro" };
      const text = bySection[id] || bySection[mapped[id]] || (sec ? sec.desc : "");
      if (sec) lines.push({ label: sec.label, text });
    });
    const closingLine = closing.trim() || "독도는 근거로 확인한 소중한 우리 땅입니다. 감사합니다.";

    const content = el("div.col", { style: { gap: "8px", maxHeight: "380px", overflowY: "auto", minWidth: "540px" } }, [
      ...lines.map((l, i) => el("div", { style: { padding: "8px 12px", background: "#fdf9ef", border: "1.5px solid var(--panel-line)", borderRadius: "10px" } }, [
        el("div", { style: { fontSize: "12px", fontWeight: "900", color: "var(--sea)" }, text: `${i + 1}. ${l.label}` }),
        el("div", { style: { fontSize: "16px", fontWeight: "700", color: "var(--ink)", lineHeight: "1.55" }, text: l.text }),
      ])),
      el("div", { style: { padding: "8px 12px", background: "#e9f8ec", border: "1.5px solid var(--green)", borderRadius: "10px" } }, [
        el("div", { style: { fontSize: "12px", fontWeight: "900", color: "var(--green-deep)" }, text: "마무리" }),
        el("div", { style: { fontSize: "16px", fontWeight: "800", color: "var(--ink)", lineHeight: "1.55" }, text: closingLine }),
      ]),
      el("div.tip", { html: "🎤 발표문을 <b>큰 소리로</b> 한 번 읽어 보며 연습해요!" }),
    ]);
    const md = modal(ctx.stage, {
      title: "발표 연습 — 전체 발표문", icon: "🎤", body: content,
      buttons: [
        button("더 다듬기", { variant: "ghost", onClick: () => md.close() }),
        button("발표 준비 완료!", { variant: "gold", icon: "🏅", onClick: () => {
          md.close();
          completeMission(ctx, "presentation", { message: "발표 순서·근거 문장·나의 마무리 문장까지 모두 완성했어요!" });
        } }),
      ],
    });
  }

  function render() {
    // 활동별 패널 높이 (내용만큼만 — 뒷배경 무대가 보이게)
    boardEl.style.height = stage === 1 ? "556px" : stage === 0 ? "432px" : "462px";
    frame.setStep(stage + 1, 3, "활동");
    qTitle.innerHTML = STAGE_TITLES[stage];
    qHolder.innerHTML = "";
    nextHolder.innerHTML = "";

    if (stage === 0) {
      qHolder.appendChild(el("div.tip", {
        html: "발표 순서에 정답은 없어요. <b>듣는 사람이 이해하기 쉬운 나만의 순서</b>를 만들어 봐요. (예: 인사를 먼저 하면 자연스러워요)",
      }));
      const order = orderInteraction({
        items: PRESENTATION_ORDER.sections.map((s) => ({ id: s.id, label: s.label })),
        answer: PRESENTATION_ORDER.answer, slotW: 100, slotH: 72,
        freeOrder: true, confirmText: "이 순서로 정했어요",
        onResult: (ok, ids) => {
          ctx.save.setPresentationOrder(ids);
          nextHolder.appendChild(nextCoachButton("다음 활동", () => { stage = 1; render(); }));
        },
      });
      qHolder.appendChild(order.node);
    } else if (stage === 1) {
      renderScriptEditor();
    } else {
      const qc = quiz(PRESENTATION_FIX, { onResult: (ok) => {
        if (!ok) return;
        nextHolder.appendChild(nextCoachButton("발표 연습하기", openRehearsal, { icon: "🎤" }));
      } });
      qHolder.appendChild(qc.node);
    }
  }
  render();
  return root;
}
