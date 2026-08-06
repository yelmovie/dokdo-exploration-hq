/* =========================================================================
   _shared.js — 미션 씬 공통 프레임 (상단바·단계 표시·도움말·완료 처리)
   ========================================================================= */
import { el } from "../core/dom.js";
import { button, iconButton, backButton, sign, modal, toast, coachify } from "../components/ui.js";
import { MISSIONS, nextMissionOf } from "../data/missions.js";
import AudioManager from "../managers/AudioManager.js";
import stats from "../managers/StatsManager.js";

/** 상단: 이전 버튼 + 명패 + 단계 칩 + 도움말. 반환 { setStep } */
export function missionFrame(ctx, layer, cfg, { signSrc = null, helpText = "" } = {}) {
  stats.reset(); // 미션 진입 시 별점 통계 초기화
  layer.appendChild(el("div.row", { style: { position: "absolute", left: "22px", top: "20px", gap: "12px", zIndex: 12 } }, [
    backButton(() => ctx.navigate("missionMap")),
  ]));
  if (signSrc) sign(layer, signSrc, { x: 108, y: -14, w: 175, h: 175, alt: cfg.title });

  const stepChip = el("div.hud-chip", { style: { position: "absolute", right: "158px", top: "28px", zIndex: 12 } });
  layer.appendChild(stepChip);

  const soundOn = () => AudioManager.bgmEnabled || AudioManager.sfxEnabled;
  const soundBtn = iconButton(soundOn() ? "🔊" : "🔇", { title: "소리 켜기/끄기", onClick: () => {
    const on = !soundOn();
    AudioManager.setBgmEnabled(on);
    AudioManager.setSfxEnabled(on);
    soundBtn.querySelector(".btn__icon").textContent = on ? "🔊" : "🔇";
  } });
  layer.appendChild(el("div.row", { style: { position: "absolute", right: "22px", top: "20px", zIndex: 12, gap: "10px" } }, [
    soundBtn,
    iconButton("❓", { title: "도움말", onClick: () => {
      const md = modal(ctx.stage, {
        title: cfg.title + " — 이렇게 해요", icon: "💡",
        bodyHtml: `<div style="font-size:16px;font-weight:700;line-height:1.6;color:var(--ink)">${helpText}</div>`,
        buttons: [button("알겠어요!", { variant: "green", onClick: () => md.close() })],
      });
    } }),
  ]));

  return {
    setStep(n, total, label = "단계") {
      stepChip.textContent = `${label} ${n} / ${total}`;
    },
  };
}

/** 접이식 힌트 */
export function hintFold(text, { x = 22, y = 640 } = {}) {
  const wrap = el("div.hintfold", { style: { position: "absolute", left: x + "px", top: y + "px", zIndex: 10 } });
  const body = el("div.hintfold__body", { text: "💡 " + text });
  const head = button("힌트 보기", { variant: "ghost", size: "sm", icon: "💡", onClick: () => {
    wrap.classList.toggle("is-open");
  } });
  wrap.appendChild(head);
  wrap.appendChild(body);
  return wrap;
}

/** 다음 행동 코치 버튼 (펄스 강조) */
export function nextCoachButton(label, onClick, { icon = "➡️" } = {}) {
  const b = button(label, { variant: "green", size: "lg", icon, onClick });
  coachify(b, { label: null });
  return b;
}

/** 미션 완료 공통 처리: 저장 + 배지 + 다음 미션 해금 + 완료 모달 */
export function completeMission(ctx, missionKey, { evidence = [], message = "" } = {}) {
  const m = MISSIONS.find((x) => x.key === missionKey);
  const next = nextMissionOf(missionKey);
  const already = ctx.save.isCompleted(missionKey);
  const score = stats.score();
  const starCount = stats.stars(score);
  ctx.save.completeMission(missionKey, {
    badgeId: m && m.badge ? m.badge.id : null,
    evidence,
    score,
    unlockNext: next,
  });
  AudioManager.badge();

  const nextM = next ? MISSIONS.find((x) => x.key === next) : null;
  const body = el("div", { style: { textAlign: "center" } }, [
    m && m.badge ? (() => {
      const img = new Image();
      img.src = m.badge.icon; img.alt = m.badge.name;
      Object.assign(img.style, { width: "130px", height: "130px", objectFit: "contain" });
      img.addEventListener("error", () => { img.style.display = "none"; });
      return el("div.badge-pop", {}, [img]);
    })() : null,
    el("div", { style: { fontSize: "30px", letterSpacing: "4px", margin: "4px 0" },
      text: "⭐".repeat(starCount) + "☆".repeat(3 - starCount) }),
    el("div", { style: { fontSize: "13.5px", fontWeight: "800", color: "var(--ink-soft)" },
      text: `탐사 점수 ${score}점 · 정확도와 근거 확인으로 계산돼요` }),
    el("div", { style: { fontSize: "20px", fontWeight: "900", color: "var(--navy)", margin: "8px 0 4px" },
      text: (m ? m.badge.name : "") + " 배지 획득!" }),
    el("div", { style: { fontSize: "15px", fontWeight: "700", color: "var(--ink-soft)", lineHeight: "1.55", wordBreak: "keep-all" }, text: message }),
    evidence.length ? el("div.tip", { style: { marginTop: "10px" }, html: "🃏 <b>근거 카드</b>를 얻었어요! 브리핑 보드 제작에서 사용해요." }) : null,
    already ? el("div", { style: { marginTop: "8px", fontSize: "13px", fontWeight: "700", color: "var(--ink-soft)" }, text: "(이미 완료한 미션이에요 — 기록은 그대로 유지돼요)" }) : null,
  ]);

  const md = modal(ctx.stage, {
    title: "미션 완료!", icon: "🏅", body,
    buttons: [
      nextM && !ctx.save.isCompleted(next)
        ? button(nextM.title + " 도전", { variant: "gold", icon: nextM.icon, onClick: () => { md.close(); ctx.navigate(nextM.pageKey); } })
        : null,
      button("미션 지도로", { variant: "green", icon: "🗺️", onClick: () => { md.close(); ctx.navigate("missionMap"); } }),
    ].filter(Boolean),
  });
  toast(ctx.stage, "진행 상황이 저장됐어요!");
}
