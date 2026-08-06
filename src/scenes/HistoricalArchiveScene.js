/* =========================================================================
   6페이지 - 기록 보관소 (HistoricalArchiveScene)
   활동 3단계: ① 기록 카드 연표 복원(순서 배열, 카드 눌러 확대 보기)
   → ② 자료 매칭 퀴즈 → ③ 사실/생각 구분(문장별 토글 판단).
   ========================================================================= */
import { el } from "../core/dom.js";
import { buildScene, placeAsset, quiz, pos, collapsible, modal, button } from "../components/ui.js";
import { orderInteraction } from "../components/interactions.js";
import { missionFrame, hintFold, nextCoachButton, completeMission } from "./_shared.js";
import { DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { HISTORY_CARDS, HISTORY_TIMELINE, HISTORY_QUESTIONS, FACT_OPINION } from "../data/questions.js";
import AudioManager from "../managers/AudioManager.js";
import stats from "../managers/StatsManager.js";

export default function HistoricalArchiveScene(ctx) {
  const cfg = PAGES.history;
  const { root, layer } = buildScene({ bg: cfg.bg, veil: "soft" });
  let stage = 0; // 0 연표, 1 매칭 퀴즈, 2 사실/생각

  const frame = missionFrame(ctx, layer, cfg, {
    signSrc: DOKDO.signHistory,
    helpText: "기록 카드를 눌러 내용을 확인하고, 옛날부터 차례대로 연표에 놓아요. 그다음 자료 매칭과 사실/생각 구분에 도전!",
  });

  /* ---- 좌측: 기록 카드 읽기(토글) — 확대 보기 ---- */
  layer.appendChild(collapsible({
    title: "기록 카드 읽어보기", icon: "📜",
    style: { ...pos(22, 96), zIndex: 9 },
    body: [el("div.col", { style: { gap: "6px" } }, HISTORY_CARDS.map((c) =>
      el("button", {
        type: "button",
        style: {
          fontFamily: "inherit", textAlign: "left", background: "#fdf6e3", border: "1.5px solid rgba(160,120,50,.35)",
          borderRadius: "10px", padding: "8px 12px", cursor: "pointer", fontSize: "13.5px", fontWeight: "800", color: "var(--ink)",
        },
        text: "🔍 " + c.label,
        onClick: () => {
          AudioManager.unlock(); AudioManager.click();
          const md = modal(ctx.stage, {
            title: c.label, icon: "📜",
            bodyHtml: `<div style="font-size:15px;font-weight:700;line-height:1.6;color:var(--ink);word-break:keep-all">${c.desc}</div>
              <div style="margin-top:8px" class="src-tag">📎 외교부 독도: 우리 영토인 근거</div>
              <div style="margin-top:6px;font-size:13px;font-weight:700;color:var(--ink-soft)">시대 단서는 연표에 놓을 때 확인돼요.</div>`,
            buttons: [button("확인", { variant: "ghost", onClick: () => md.close() })],
          });
        },
      })))],
  }));

  /* ---- 캐릭터 ---- */
  placeAsset(layer, DOKDO.sageFigure, { x: 30, y: 420, w: 220, h: 290, alt: "역사 인물", z: 3 });
  placeAsset(layer, DOKDO.readerGirl, { x: 1060, y: 440, w: 200, h: 270, alt: "책 읽는 소녀", float: true, z: 3 });

  /* ---- 중앙 활동 보드 ---- */
  const board = el("div.q-board", { style: { ...pos(280, 108, 730, 566) } }, [el("div.q-board__clip")]);
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

  /* ---- ① 연표 복원 ---- */
  function renderTimeline() {
    frame.setStep(1, 3, "활동");
    qTitle.innerHTML = "<b>활동 1.</b> " + HISTORY_TIMELINE.prompt;
    workArea.innerHTML = "";
    nextHolder.innerHTML = "";

    const order = orderInteraction({
      items: HISTORY_CARDS.map((c) => ({ id: c.id, label: c.label })),
      answer: HISTORY_TIMELINE.answer,
      slotW: 158, slotH: 86,
      onResult: (ok) => {
        if (!ok) return;
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
    workArea.appendChild(el("div.tip", { html: "🖐️ 왼쪽 <b>기록 카드 읽어보기</b>에서 내용을 먼저 확인하면 쉬워요. 카드를 눌러 슬롯에 놓아요." }));
    workArea.appendChild(order.node);
    setHint("가장 오래된 기록은 신라 시대(512년) 이야기예요. 가장 최근은 ‘대한제국’이 들어간 기록이에요.");
  }

  /* ---- ② 자료 매칭 퀴즈 ---- */
  function renderMatching() {
    frame.setStep(2, 3, "활동");
    const q = HISTORY_QUESTIONS[0];
    qTitle.innerHTML = "<b>활동 2.</b> " + q.prompt;
    workArea.innerHTML = "";
    nextHolder.innerHTML = "";
    const qc = quiz(q, { onResult: (ok) => {
      if (!ok) return;
      nextHolder.appendChild(nextCoachButton("다음 활동", () => { stage = 2; render(); }));
    } });
    workArea.appendChild(qc.node);
    setHint(q.hint);
  }

  /* ---- ③ 사실/생각 구분 ---- */
  function renderFactOpinion() {
    frame.setStep(3, 3, "활동");
    qTitle.innerHTML = "<b>활동 3.</b> " + FACT_OPINION.prompt;
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
    else if (stage === 1) renderMatching();
    else renderFactOpinion();
  }
  render();
  return root;
}
