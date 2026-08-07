/* =========================================================================
   2페이지 - 탐사본부 브리핑 (BriefingScene)
   배경(브리핑룸)의 실제 코르크보드 안에 목표 메모 5장이 핀으로 꽂혀 있다.
   5장을 모두 읽으면 미션 지도 해금.
   ========================================================================= */
import { el, assetImg } from "../core/dom.js";
import { buildScene, button, modal, toast, backButton, coachify, uncoach, speech, titleRibbon, placeAsset } from "../components/ui.js";
import { DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { BRIEFING_FIELDS } from "../data/missions.js";
import { nextCoachButton } from "./_shared.js";
import AudioManager from "../managers/AudioManager.js";

const GOAL_ICON = {
  location: "pinIsland", geology: "cliff", history: "oldBook",
  ecology: "ecoLeaf", protection: "shieldEco",
};

const GOAL_DETAILS = {
  location:   { goal: "독도가 어디에 있는 섬인지 지도 단서로 설명하기", how: "항로 복원실에서 방향·거리 단서를 읽어요." },
  geology:    { goal: "독도의 지형 특징과 생활 조건을 연결해 설명하기", how: "바위섬 분석실에서 지형 단서 4개를 관찰해요." },
  history:    { goal: "역사 기록을 시간 순서에 맞게 정리하기", how: "기록 보관소에서 연표를 복원하고 사실과 생각을 구분해요." },
  ecology:    { goal: "독도의 생물과 자연의 가치를 근거로 말하기", how: "생태 수호 작전에서 관찰 구역 단서를 모아요." },
  protection: { goal: "독도를 지키는 알맞은 행동을 판단하기", how: "상황을 읽고 가장 알맞은 보호 행동을 골라요." },
};

/* 코르크보드 내부 좌표 — bg_briefing3(대형 보드 x216..796, y100..420) 기준 */
const PIN_POS = [
  { x: 240, y: 112, r: -2.5 },
  { x: 420, y: 106, r: 1.5 },
  { x: 600, y: 114, r: -1 },
  { x: 330, y: 286, r: 2 },
  { x: 510, y: 282, r: -2 },
];

export default function BriefingScene(ctx) {
  const cfg = PAGES.briefing;
  const { root, layer } = buildScene({ bg: cfg.bg });
  const read = new Set();

  layer.appendChild(el("div.row", { style: { position: "absolute", left: "22px", top: "20px", gap: "12px", zIndex: 12 } }, [
    backButton(() => ctx.navigate("main")),
  ]));

  titleRibbon(layer, "탐사본부 브리핑 — 사라진 독도 기록을 복원하라", { top: 14 });

  const progChip = el("div.hud-chip", { style: { position: "absolute", right: "22px", top: "22px", zIndex: 12 }, text: "목표 0 / 5" });
  layer.appendChild(progChip);

  /* 외교부 기본입장 인용은 목표 5개를 모두 읽은 뒤 중앙 패널로 등장 (unlockReady) */

  /* ---- 목표 메모 5장 (코르크보드 안, 핀 꽂힌 메모지) ---- */
  BRIEFING_FIELDS.forEach((f, i) => {
    const d = GOAL_DETAILS[f.key];
    const p = PIN_POS[i];
    const ic = assetImg(DOKDO[GOAL_ICON[f.key]], f.label);
    Object.assign(ic.style, { width: "52px", height: "52px", objectFit: "contain" });
    const card = el("div.pin-card", { style: { left: p.x + "px", top: p.y + "px", transform: `rotate(${p.r}deg)`, zIndex: 6 } }, [
      ic,
      el("div", { style: { fontSize: "16px", fontWeight: "900", color: "var(--navy)" }, text: f.label }),
      el("div", { style: { fontSize: "11.5px", fontWeight: "700", color: "var(--ink-soft)", textAlign: "center", lineHeight: "1.4", wordBreak: "keep-all" }, text: d.goal }),
      el("div.pill", { style: { background: "var(--sea-deep)", fontSize: "11px", padding: "2px 10px", marginTop: "auto" }, text: "읽기" }),
    ]);
    coachify(card, { label: null });
    card.tabIndex = 0; card.setAttribute("role", "button");
    card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); card.click(); } });
    card.addEventListener("click", () => {
      AudioManager.unlock(); AudioManager.click();
      const big = assetImg(DOKDO[GOAL_ICON[f.key]], f.label);
      Object.assign(big.style, { width: "84px", height: "84px", objectFit: "contain" });
      const body = el("div.col", { style: { gap: "10px", alignItems: "center", maxWidth: "440px" } }, [
        big,
        el("div", { style: { fontSize: "17px", fontWeight: "900", color: "var(--navy)", textAlign: "center", wordBreak: "keep-all" }, text: d.goal }),
        el("div", { style: { fontSize: "14px", fontWeight: "700", color: "var(--ink-soft)", textAlign: "center", lineHeight: "1.6", wordBreak: "keep-all" }, text: "🧭 " + d.how }),
      ]);
      const md = modal(ctx.stage, {
        title: `오늘의 목표 — ${f.label}`, icon: "🎯", body,
        buttons: [button("확인했어요!", { variant: "green", onClick: () => {
          md.close();
          if (!read.has(f.key)) {
            read.add(f.key);
            uncoach(card);
            card.querySelector(".pill").textContent = "✅ 완료";
            card.querySelector(".pill").style.background = "var(--green)";
            progChip.textContent = `목표 ${read.size} / 5`;
            if (read.size === 5) unlockReady();
            else toast(ctx.stage, `목표 ${read.size}개 확인! 나머지 메모도 읽어 봐요.`);
          }
        } })],
      });
    });
    layer.appendChild(card);
  });

  /* ---- 등대 마스코트(좌측 창가 책상) + 머리 위 말풍선 (타이핑) ---- */
  placeAsset(layer, DOKDO.lighthouseChar, { x: 58, y: 442, w: 168, h: 198, alt: "등대 마스코트", float: true, z: 5, shadow: true });
  speech(layer, { x: 46, y: 328, text: "코르크보드의 목표 메모 5장을 눌러 읽어 봐! 다 읽으면 항로도가 열려.", tail: "left", width: 225 });

  /* ---- 하단: 준비 완료(게이팅) ---- */
  const readyHolder = el("div", {
    style: { position: "absolute", right: "60px", bottom: "44px", zIndex: 8 },
  });
  layer.appendChild(readyHolder);

  function unlockReady() {
    AudioManager.correct();
    showQuotePanel();
  }

  /* 목표 5개 완료 → 외교부 기본입장이 중앙 대형 패널에 타이핑으로 등장 (읽기 강화) */
  function showQuotePanel() {
    const QUOTE = "“독도는 역사적·지리적·국제법적으로 명백한 우리 고유의 영토입니다.”";
    const panel = el("div", { style: {
      position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)",
      width: "740px", zIndex: 40, textAlign: "center",
      background: "rgba(253,246,227,.97)", border: "4px solid var(--gold-deep)", borderRadius: "22px",
      boxShadow: "0 26px 64px rgba(13,39,67,.5)", padding: "34px 40px 28px",
    } }, [
      el("div", { style: { fontFamily: "var(--font-display)", fontSize: "26px", color: "var(--sea-deep)", marginBottom: "16px" }, text: "📜 외교부 기본입장" }),
    ]);
    const line = el("div", { style: { fontSize: "26px", fontWeight: "800", color: "var(--navy)", lineHeight: "1.75", wordBreak: "keep-all", minHeight: "94px" } });
    const sub = el("div", { style: { fontSize: "18px", fontWeight: "800", color: "var(--green-deep)", marginTop: "14px", opacity: "0", transition: "opacity .4s", wordBreak: "keep-all" },
      text: "이 사실의 근거 다섯 가지를 우리가 직접 확인했어요!" });
    const btnRow = el("div.row", { style: { justifyContent: "center", marginTop: "18px", opacity: "0", transition: "opacity .4s" } }, [
      button("확인했어요! 탐사 항로도로", { variant: "gold", size: "lg", icon: "🗺", onClick: () => {
        panel.remove();
        readyHolder.innerHTML = "";
        readyHolder.appendChild(nextCoachButton("준비 완료! 탐사 항로도로", () => ctx.navigate("missionMap"), { icon: "🗺" }));
        toast(ctx.stage, "목표 5개 확인 완료! 탐사를 시작해요");
      } }),
    ]);
    panel.appendChild(line); panel.appendChild(sub); panel.appendChild(btnRow);
    layer.appendChild(panel);

    const finish = () => { line.textContent = QUOTE; sub.style.opacity = "1"; btnRow.style.opacity = "1"; };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) { finish(); return; }
    let i = 0;
    const timer = setInterval(() => {
      i++;
      line.textContent = QUOTE.slice(0, i);
      if (i >= QUOTE.length) { clearInterval(timer); finish(); }
    }, 45);
    panel.addEventListener("pointerdown", () => { clearInterval(timer); finish(); }, { once: true }); // 탭 = 전문 표시
  }

  return root;
}
