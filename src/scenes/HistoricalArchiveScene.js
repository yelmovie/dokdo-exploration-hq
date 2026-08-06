/* =========================================================================
   6페이지 - 기록 보관소 (HistoricalArchiveScene)
   활동 3단계: ① 기록 카드 연표 복원(순서 배열, 카드 눌러 확대 보기)
   → ② 자료 매칭 퀴즈 → ③ 사실/생각 구분(문장별 토글 판단).
   ========================================================================= */
import { el, assetImg } from "../core/dom.js";
import { buildScene, placeAsset, quiz, pos, collapsible, modal, button, speech } from "../components/ui.js";
import { orderInteraction } from "../components/interactions.js";
import { missionFrame, hintFold, nextCoachButton, completeMission, awardDex } from "./_shared.js";
import { DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { HISTORY_CARDS, HISTORY_TIMELINE, HISTORY_QUESTIONS, FACT_OPINION } from "../data/questions.js";
import AudioManager from "../managers/AudioManager.js";
import stats from "../managers/StatsManager.js";

export default function HistoricalArchiveScene(ctx) {
  const cfg = PAGES.history;
  const { root, layer } = buildScene({ bg: cfg.bg, veil: "soft" });
  let stage = 0; // 0 연표, 1 퀴즈(3문항), 2 사실/생각
  let qi = 0;

  const frame = missionFrame(ctx, layer, cfg, {
    signSrc: DOKDO.signHistory,
    helpText: "기록 카드를 눌러 내용을 확인하고, 옛날부터 차례대로 연표에 놓아요. 그다음 자료 매칭과 사실/생각 구분에 도전!",
  });

  /* ---- 좌측: 기록 카드 읽기(토글) — 확대 보기 ---- */
  layer.appendChild(collapsible({
    title: "기록 카드 읽어보기", icon: "📜",
    style: { ...pos(22, 96), zIndex: 9 },
    open: true,
    body: [el("div.col", { style: { gap: "7px" } }, HISTORY_CARDS.map((c) => {
      const icon = assetImg(DOKDO[c.icon] || DOKDO.oldBook, "");
      Object.assign(icon.style, { width: "48px", height: "48px", objectFit: "contain", flex: "0 0 auto" });
      const cardBtn = el("button", {
        type: "button",
        style: {
          fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: "9px",
          background: "linear-gradient(165deg,#fbf5e6,#f3e8cd)", border: "1px solid #d9c08a",
          borderRadius: "12px", padding: "9px 12px", cursor: "pointer", minHeight: "52px",
          boxShadow: "0 2px 6px rgba(90,64,20,.12), inset 0 1px 0 rgba(255,255,255,.7)",
          width: "100%",
        },
      }, [
        icon,
        el("div", {}, [
          el("div", { style: { fontSize: "13.5px", fontWeight: "800", color: "var(--ink)" }, text: c.label }),
          el("div", { style: { fontSize: "11.5px", fontWeight: "700", color: "#a07c33" }, text: "자세히 읽기" }),
        ]),
      ]);
      cardBtn.addEventListener("click", () => {
        AudioManager.unlock(); AudioManager.click();
        if (c.id === "h1") awardDex(ctx, "d-isabu");
        if (c.id === "h3") awardDex(ctx, "d-anyongbok");
        const big = assetImg(DOKDO[c.icon] || DOKDO.oldBook, c.label);
        Object.assign(big.style, { width: "92px", height: "92px", objectFit: "contain" });
        const body = el("div.col", { style: { gap: "10px", alignItems: "center", maxWidth: "480px" } }, [
          big,
          el("div.pill", { style: { background: "#8a5a2b" }, text: c.year }),
          el("div", { style: { fontSize: "15px", fontWeight: "700", lineHeight: "1.65", color: "var(--ink)", wordBreak: "keep-all", textAlign: "center" }, text: c.desc }),
          el("div", { style: { fontSize: "14px", fontWeight: "800", color: "var(--sea-deep)", background: "rgba(31,122,194,.08)", borderRadius: "10px", padding: "8px 14px", wordBreak: "keep-all", textAlign: "center" }, text: "💡 " + c.point }),
          el("div.src-tag", { text: "📎 외교부 독도: 우리 영토인 근거" }),
        ]);
        const md = modal(ctx.stage, {
          title: c.label, icon: "📜", body,
          buttons: [button("확인", { variant: "green", onClick: () => md.close() })],
        });
      });
      return cardBtn;
    }))],
  }));

  /* ---- 캐릭터 + 말풍선 ---- */
  placeAsset(layer, DOKDO.sageFigure, { x: 34, y: 464, w: 190, h: 250, alt: "역사 인물", z: 3, shadow: true });
  placeAsset(layer, DOKDO.readerGirl, { x: 1064, y: 452, w: 195, h: 262, alt: "책 읽는 소녀", float: true, z: 3, shadow: true });
  speech(layer, { x: 1002, y: 328, text: "천장에 걸린 기록들이 보여? 다섯 기록을 시간 순서로 이어 보자!", tail: "right", width: 235 });

  /* ---- 중앙 활동 보드 ---- */
  const board = el("div.q-board", { style: { ...pos(292, 116, 690, 476) } }, [el("div.q-board__clip")]);
  const qTitle = el("div.q-board__title");
  const workArea = el("div", { style: { flex: "1", minHeight: "0", overflowY: "auto", paddingRight: "4px" } });
  const nextHolder = el("div.row", { style: { justifyContent: "flex-end", minHeight: "0" } });
  board.appendChild(qTitle); board.appendChild(workArea); board.appendChild(nextHolder);
  layer.appendChild(board);

  const hintHolder = el("div");
  layer.appendChild(hintHolder);

  function setHint(text) {
    hintHolder.innerHTML = "";
    hintHolder.appendChild(hintFold(text, { x: 22, y: 640 }));
  }

  const TOTAL = 2 + HISTORY_QUESTIONS.length; // 연표 + 퀴즈들 + 사실/생각

  /* ---- ① 연표 복원 ---- */
  function renderTimeline() {
    frame.setStep(1, TOTAL, "활동");
    qTitle.innerHTML = "<b>활동 1.</b> " + HISTORY_TIMELINE.prompt;
    workArea.innerHTML = "";
    nextHolder.innerHTML = "";

    const order = orderInteraction({
      items: HISTORY_CARDS.map((c) => ({ id: c.id, label: c.label })),
      answer: HISTORY_TIMELINE.answer,
      slotW: 116, slotH: 84,
      onResult: (ok) => {
        if (!ok) return;
        awardDex(ctx, ["d-samguk", "d-sejong", "d-taejeong", "d-chikryeong"]);
        // 정답: 연도 공개
        const yearsRow = el("div.row", { style: { justifyContent: "center", gap: "10px", flexWrap: "wrap", marginTop: "6px" } },
          HISTORY_CARDS.map((c) => el("div", {
            style: { background: "#eaf4fd", border: "1.5px solid var(--sea-light)", borderRadius: "999px", padding: "4px 14px", fontSize: "13px", fontWeight: "900", color: "var(--sea-deep)" },
            text: `${c.year} · ${c.label}`,
          })));
        workArea.appendChild(yearsRow);
        nextHolder.appendChild(nextCoachButton("다음 활동", () => { stage = 1; render(); }));
      },
    });
    workArea.appendChild(el("div.tip", { style: { fontSize: "13px", padding: "7px 12px" }, html: "왼쪽 <b>기록 카드 읽어보기</b>에서 내용을 먼저 확인하면 쉬워요. 카드를 눌러 슬롯에 놓아요." }));
    // 트레이를 3+2 두 줄로 고정 (폭 제한)
    const tray = order.node.querySelector(".order__tray");
    Object.assign(tray.style, { maxWidth: "600px", margin: "0 auto" });
    workArea.appendChild(order.node);
    setHint("가장 오래된 기록은 신라 시대(512년) 이야기예요. 가장 최근은 ‘대한제국’이 들어간 기록이에요.");
  }

  /* ---- ② 기록 해석 퀴즈 (3문항) ---- */
  function renderQuizzes() {
    const q = HISTORY_QUESTIONS[qi];
    frame.setStep(2 + qi, TOTAL, "활동");
    qTitle.innerHTML = `<b>활동 ${2 + qi}.</b> ` + q.prompt;
    workArea.innerHTML = "";
    nextHolder.innerHTML = "";
    const qc = quiz(q, { onResult: (ok) => {
      if (!ok) return;
      if (q.id === "S3-Q4") awardDex(ctx, "d-dohae"); // 보너스: 일본 측 자료 카드
      nextHolder.appendChild(nextCoachButton("다음 활동", () => {
        if (qi < HISTORY_QUESTIONS.length - 1) { qi++; render(); }
        else { stage = 2; render(); }
      }));
    } });
    workArea.appendChild(qc.node);
    setHint(q.hint);
  }

  /* ---- ③ 사실/생각 구분 ---- */
  function renderFactOpinion() {
    frame.setStep(TOTAL, TOTAL, "활동");
    qTitle.innerHTML = `<b>활동 ${TOTAL}.</b> ` + FACT_OPINION.prompt;
    workArea.innerHTML = "";
    nextHolder.innerHTML = "";

    const picks = {}; // id -> "fact"|"opinion"
    const fb = el("div.feedback");
    const rows = FACT_OPINION.items.map((item) => {
      const factBtn = el("button", { type: "button", style: toggleStyle(), text: "사실" });
      const opBtn = el("button", { type: "button", style: toggleStyle(), text: "생각" });
      function paint() {
        [[factBtn, "fact"], [opBtn, "opinion"]].forEach(([b, v]) => {
          const on = picks[item.id] === v;
          b.style.background = on ? "var(--sea)" : "#fff";
          b.style.color = on ? "#fff" : "var(--sea-deep)";
        });
        checkBtn.disabled = FACT_OPINION.items.some((x) => !picks[x.id]);
      }
      factBtn.addEventListener("click", () => { AudioManager.unlock(); AudioManager.click(); picks[item.id] = "fact"; paint(); });
      opBtn.addEventListener("click", () => { AudioManager.unlock(); AudioManager.click(); picks[item.id] = "opinion"; paint(); });
      item._paint = paint;
      return el("div", { style: { display: "flex", alignItems: "center", gap: "10px", background: "var(--paper)", border: "1.5px solid var(--panel-line)", borderRadius: "12px", padding: "10px 12px" } }, [
        el("div", { style: { flex: "1", fontSize: "15px", fontWeight: "700", color: "var(--ink)", lineHeight: "1.5", wordBreak: "keep-all" }, text: item.text }),
        el("div.row", { style: { gap: "6px", flex: "0 0 auto" } }, [factBtn, opBtn]),
      ]);
    });

    let wrongCount = 0;
    const checkBtn = button("판단 확인", { variant: "gold", icon: "🔍", disabled: true, onClick: () => {
      const ok = FACT_OPINION.items.every((x) => picks[x.id] === x.answer);
      if (!ok) {
        wrongCount++;
        stats.wrong++;
        AudioManager.wrong();
        fb.className = "feedback show feedback--no";
        fb.textContent = wrongCount >= 3
          ? "💡 힌트 · ‘기록으로 확인할 수 있으면 사실, 느낌·의견이면 생각’이에요. ‘느낀다’ 같은 말을 찾아봐요."
          : "🤔 다시 판단해 봐요. 기록이나 조사로 확인할 수 있는 문장인가요?";
        return;
      }
      AudioManager.correct();
      fb.className = "feedback show feedback--ok";
      fb.innerHTML = "✅ <b>정답!</b> " + FACT_OPINION.items.map((x) => `「${x.text.slice(0, 14)}…」→ ${x.answer === "fact" ? "사실" : "생각"} (${x.why})`).join("<br>");
      checkBtn.style.display = "none";
      nextHolder.appendChild(nextCoachButton("미션 완료!", () =>
        completeMission(ctx, "history", { evidence: "c-his", message: "옛 기록을 연표로 복원하고, 사실과 생각을 구분했어요." }), { icon: "🏅" }));
    } });

    workArea.appendChild(el("div.col", { style: { gap: "8px" } }, [
      ...rows,
      el("div.row", { style: { justifyContent: "center", marginTop: "4px" } }, [checkBtn]),
      fb,
    ]));
    setHint("사실 = 기록·자료로 확인 가능. 생각 = 사람마다 다를 수 있는 느낌이나 의견.");
  }

  function toggleStyle() {
    return {
      fontFamily: "inherit", fontSize: "14px", fontWeight: "900", color: "var(--sea-deep)",
      background: "#fff", border: "2px solid var(--sea)", borderRadius: "999px",
      padding: "7px 16px", cursor: "pointer", minHeight: "40px",
    };
  }

  function render() {
    if (stage === 0) renderTimeline();
    else if (stage === 1) renderQuizzes();
    else renderFactOpinion();
  }
  render();
  return root;
}
