/* =========================================================================
   2페이지 - 탐사본부 브리핑 (BriefingScene)
   목표 카드 5장(위치·지형·역사·생태·보호)을 모두 눌러 읽어야
   '준비 완료' 버튼이 열린다(게이팅). 외울 것보다 '모을 근거'를 확인.
   ========================================================================= */
import { el } from "../core/dom.js";
import { buildScene, placeAsset, button, modal, toast, backButton, coachify, uncoach, pressable } from "../components/ui.js";
import { DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { BRIEFING_FIELDS } from "../data/missions.js";
import { nextCoachButton } from "./_shared.js";
import AudioManager from "../managers/AudioManager.js";

const GOAL_DETAILS = {
  location:   { goal: "독도가 어디에 있는 섬인지 지도 단서로 설명하기", how: "항로 복원실에서 방향·거리 단서를 읽어요." },
  geology:    { goal: "독도의 지형 특징과 생활 조건을 연결해 설명하기", how: "바위섬 분석실에서 지형 단서 4개를 관찰해요." },
  history:    { goal: "역사 기록을 시간 순서에 맞게 정리하기", how: "기록 보관소에서 연표를 복원하고 사실과 생각을 구분해요." },
  ecology:    { goal: "독도의 생물과 자연의 가치를 근거로 말하기", how: "생태 수호 작전에서 관찰 구역 단서를 모아요." },
  protection: { goal: "독도를 지키는 알맞은 행동을 판단하기", how: "상황을 읽고 가장 알맞은 보호 행동을 골라요." },
};

export default function BriefingScene(ctx) {
  const cfg = PAGES.briefing;
  const { root, layer } = buildScene({ bg: cfg.bg, veil: "soft" });
  const read = new Set();

  layer.appendChild(el("div.row", { style: { position: "absolute", left: "22px", top: "20px", gap: "12px", zIndex: 12 } }, [
    backButton(() => ctx.navigate("main")),
  ]));

  /* ---- 중앙 브리핑 보드 제목 ---- */
  layer.appendChild(el("div", {
    style: {
      position: "absolute", left: "50%", top: "34px", transform: "translateX(-50%)", zIndex: 6,
      background: "rgba(20,54,92,.92)", color: "#fff", fontWeight: "900", fontSize: "24px",
      padding: "12px 36px", borderRadius: "18px", boxShadow: "var(--shadow)", whiteSpace: "nowrap",
    },
    text: "📋 탐사본부 브리핑 — 사라진 독도 기록을 복원하라",
  }));
  layer.appendChild(el("div", {
    style: {
      position: "absolute", left: "50%", top: "96px", transform: "translateX(-50%)", zIndex: 6,
      color: "#fff", fontSize: "15.5px", fontWeight: "700", textShadow: "0 1px 4px rgba(0,0,0,.55)", whiteSpace: "nowrap",
    },
    text: "다섯 개의 조사 구역에서 근거 카드를 모아 브리핑 보드를 완성해요. 카드를 눌러 오늘의 목표를 확인!",
  }));

  /* ---- 안내 캐릭터 ---- */
  placeAsset(layer, DOKDO.robotGuide, { x: 40, y: 400, w: 230, h: 300, alt: "로봇 가이드", float: true, z: 4 });
  placeAsset(layer, DOKDO.briefingDoc, { x: 1080, y: 480, w: 160, h: 200, alt: "브리핑 문서", z: 3 });

  /* ---- 진행 칩 ---- */
  const progChip = el("div.hud-chip", { style: { position: "absolute", right: "22px", top: "24px", zIndex: 12 }, text: "목표 확인 0 / 5" });
  layer.appendChild(progChip);

  /* ---- 목표 카드 5장 ---- */
  const cardsRow = el("div.row", {
    style: { position: "absolute", left: "50%", top: "150px", transform: "translateX(-50%)", gap: "16px", zIndex: 6 },
  });
  BRIEFING_FIELDS.forEach((f) => {
    const d = GOAL_DETAILS[f.key];
    const card = el("div", {
      style: {
        width: "190px", minHeight: "220px", background: "rgba(255,255,255,.96)",
        border: `3px solid ${f.color}`, borderRadius: "18px", boxShadow: "var(--shadow)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
        padding: "18px 14px", cursor: "pointer", transition: "transform .15s",
      },
    }, [
      el("div", { style: { fontSize: "44px" }, text: f.icon }),
      el("div", { style: { fontSize: "20px", fontWeight: "900", color: f.color }, text: f.label }),
      el("div", { style: { fontSize: "13.5px", fontWeight: "700", color: "var(--ink-soft)", textAlign: "center", lineHeight: "1.5", wordBreak: "keep-all" }, text: d.goal }),
      el("div.pill", { style: { background: f.color, fontSize: "12.5px", marginTop: "auto" }, text: "눌러서 확인" }),
    ]);
    coachify(card, { label: null });
    pressable(card);
    card.addEventListener("click", () => {
      AudioManager.unlock(); AudioManager.click();
      const md = modal(ctx.stage, {
        title: `${f.icon} 오늘의 목표 — ${f.label}`, icon: "🎯",
        bodyHtml: `<div style="font-size:16px;font-weight:800;color:var(--navy);line-height:1.6;word-break:keep-all">${d.goal}</div>
          <div style="margin-top:8px;font-size:14.5px;font-weight:700;color:var(--ink-soft);line-height:1.6;word-break:keep-all">🧭 ${d.how}</div>`,
        buttons: [button("확인했어요!", { variant: "green", onClick: () => {
          md.close();
          if (!read.has(f.key)) {
            read.add(f.key);
            uncoach(card);
            card.style.borderStyle = "solid";
            card.style.transform = "translateY(-4px)";
            card.querySelector(".pill").textContent = "✅ 확인 완료";
            progChip.textContent = `목표 확인 ${read.size} / 5`;
            if (read.size === 5) unlockReady();
            else toast(ctx.stage, `목표 ${read.size}개 확인! 나머지 카드도 읽어 봐요.`);
          }
        } })],
      });
    });
    cardsRow.appendChild(card);
  });
  layer.appendChild(cardsRow);

  /* ---- 하단: 준비 완료(게이팅) ---- */
  const readyHolder = el("div", {
    style: { position: "absolute", left: "50%", bottom: "48px", transform: "translateX(-50%)", zIndex: 8 },
  }, [
    el("div.tip", { text: "🔒 목표 카드 5장을 모두 읽으면 미션 지도가 열려요." }),
  ]);
  layer.appendChild(readyHolder);

  function unlockReady() {
    AudioManager.correct();
    readyHolder.innerHTML = "";
    readyHolder.appendChild(nextCoachButton("준비 완료! 미션 지도로", () => ctx.navigate("missionMap"), { icon: "🗺️" }));
    toast(ctx.stage, "목표 5개 확인 완료! 탐사를 시작해요");
  }

  return root;
}
