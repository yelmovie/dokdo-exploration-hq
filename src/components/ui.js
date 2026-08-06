/* =========================================================================
   ui.js — 공통 UI 컴포넌트 (버튼·모달·토스트·퀴즈·수납 패널·코치 강조)
   모든 버튼/패널은 CSS 구현. 이미지 에셋은 배경·캐릭터·명패·배지만 사용.
   ========================================================================= */
import { el, assetImg } from "../core/dom.js";
import AudioManager from "../managers/AudioManager.js";
import stats from "../managers/StatsManager.js";

/** 1280×720 스테이지 좌표 배치 헬퍼 */
export function pos(x, y, w, h) {
  const s = { position: "absolute", left: x + "px", top: y + "px" };
  if (w != null) s.width = w + "px";
  if (h != null) s.height = h + "px";
  return s;
}

/** 씬 루트 + 배경 + 레이어 */
export function buildScene({ bg, veil = "none" } = {}) {
  const root = el("div.scene");
  if (bg) root.style.backgroundImage = `url("${encodeURI(bg)}")`;
  if (veil !== "none") root.appendChild(el("div.scene__veil.scene__veil--" + veil));
  const layer = el("div.scene__layer");
  root.appendChild(layer);
  return { root, layer };
}

/** 캐릭터/오브젝트 배치 (float: 둥실 애니메이션) */
export function placeAsset(layer, src, { x, y, w, h, alt = "", float = false, z = 2 } = {}) {
  const img = assetImg(src, alt);
  Object.assign(img.style, {
    position: "absolute", left: x + "px", top: y + "px",
    width: w + "px", height: h + "px", objectFit: "contain",
    zIndex: String(z), pointerEvents: "none",
  });
  if (float) img.classList.add("floaty");
  layer.appendChild(img);
  return img;
}

/** 스테이지 명패 이미지 */
export function sign(layer, src, { x, y, w, h, alt = "" } = {}) {
  return placeAsset(layer, src, { x, y, w, h, alt, z: 11 });
}

/** CSS 버튼 */
export function button(label, { variant = "sea", size = "md", icon = "", onClick = null, disabled = false } = {}) {
  const b = el("button.btn.btn--" + variant + ".btn--" + size, { type: "button" }, [
    icon ? el("span.btn__icon", { text: icon }) : null,
    el("span", { text: label }),
  ]);
  b.disabled = disabled;
  if (onClick) b.addEventListener("click", (e) => { AudioManager.unlock(); AudioManager.click(); onClick(e); });
  return b;
}

/** 원형 아이콘 버튼 (우측 상단 소리·설정·도움말용) */
export function iconButton(icon, { title = "", onClick = null, variant = "ghost" } = {}) {
  const b = el("button.btn.btn--" + variant + ".btn--icon", { type: "button", attrs: { "aria-label": title, title } }, [
    el("span.btn__icon", { text: icon }),
  ]);
  if (onClick) b.addEventListener("click", (e) => { AudioManager.unlock(); AudioManager.click(); onClick(e); });
  return b;
}

export function backButton(onClick) { return button("이전", { variant: "ghost", size: "sm", icon: "◀", onClick }); }
export function homeButton(onClick) { return button("처음으로", { variant: "ghost", size: "sm", icon: "⌂", onClick }); }

/** HUD 알약 라벨 (관찰 영역 제목·단서 카운터 등) */
export function hudPill(text, { variant = "navy", style = {} } = {}) {
  const colors = {
    navy: { background: "rgba(20,54,92,.92)", color: "#fff" },
    sea: { background: "var(--sea)", color: "#fff" },
    green: { background: "rgba(47,158,68,.95)", color: "#fff" },
  };
  return el("div", { style: {
    ...colors[variant], fontWeight: "900", fontSize: "14px", padding: "5px 14px",
    borderRadius: "999px", boxShadow: "var(--shadow-sm)", ...style,
  }, text });
}

/** 게이팅 잠금 오버레이 — remove() 는 호출부에서 opacity 후 제거 */
export function lockOverlay({ icon = "🔒", title = "", desc = "" } = {}) {
  return el("div.lock-overlay", { style: { position: "absolute", inset: "0", zIndex: 40, borderRadius: "inherit",
    background: "rgba(21,38,60,.62)", backdropFilter: "blur(3px)", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", gap: "10px", textAlign: "center", color: "#fff",
    transition: "opacity .3s", padding: "20px" } }, [
    el("div", { style: { fontSize: "46px" }, text: icon }),
    el("div", { style: { fontWeight: "900", fontSize: "20px" }, text: title }),
    el("div", { style: { fontWeight: "700", fontSize: "14px", opacity: ".9", lineHeight: "1.5" }, text: desc }),
  ]);
}

/** 클릭형 div 에 키보드 접근 부여 (Enter/Space = 클릭) */
export function pressable(node) {
  node.tabIndex = 0;
  node.setAttribute("role", "button");
  node.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); node.click(); }
  });
  return node;
}

/** 알약형 소제목 */
export function pillHead(text, variant = "sea") {
  return el("span.pill.pill--" + variant, { text });
}

/** 토스트 (중복 호출 시 교체) */
let toastTimer = 0;
export function toast(stage, msg) {
  const old = stage.querySelector(".toast");
  if (old) old.remove();
  const t = el("div.toast", { text: msg });
  stage.appendChild(t);
  requestAnimationFrame(() => t.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove("show");
    setTimeout(() => t.remove(), 300);
  }, 2200);
}

/** 모달 — role=dialog, 포커스 트랩, Esc(리스너는 mask), preventScroll */
export function modal(stage, { title = "", icon = "", body = null, bodyHtml = "", buttons = [] } = {}) {
  const prevFocus = document.activeElement;
  const mask = el("div.modal-mask");
  const box = el("div.modal", { attrs: { role: "dialog", "aria-modal": "true", "aria-label": title } });
  box.appendChild(el("div.modal__head", {}, [
    icon ? el("span.modal__icon", { text: icon }) : null,
    el("span.modal__title", { text: title }),
  ]));
  const bodyEl = el("div.modal__body");
  if (body) bodyEl.appendChild(body);
  else if (bodyHtml) bodyEl.innerHTML = bodyHtml;
  box.appendChild(bodyEl);
  const btnRow = el("div.modal__btns");
  buttons.forEach((b) => btnRow.appendChild(b));
  box.appendChild(btnRow);
  mask.appendChild(box);
  stage.appendChild(mask);

  function close() {
    mask.remove();
    if (prevFocus && prevFocus.focus) { try { prevFocus.focus({ preventScroll: true }); } catch { /* 무시 */ } }
  }
  const api = { close, el: mask };

  mask.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.stopPropagation(); close(); return; }
    if (e.key !== "Tab") return;
    const focusables = box.querySelectorAll("button, [href], input, textarea, select, [tabindex]:not([tabindex='-1'])");
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus({ preventScroll: true }); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus({ preventScroll: true }); }
  });
  mask.addEventListener("pointerdown", (e) => { if (e.target === mask) close(); });

  const firstBtn = box.querySelector("button, textarea, input");
  if (firstBtn) { try { firstBtn.focus({ preventScroll: true }); } catch { /* 무시 */ } }
  AudioManager.open();
  return api;
}

/** 수납형(토글) 패널 — 기본 접힘 */
export function collapsible({ title = "", icon = "", variant = "sea", style = {}, body = [], open = false } = {}) {
  const wrap = el("div.collapsible.collapsible--" + variant, { style });
  const bodyEl = el("div.collapsible__body", {}, body);
  const head = el("button.collapsible__head", { type: "button" }, [
    el("span", { text: icon + " " + title }),
    el("span.collapsible__arrow", { text: "▾" }),
  ]);
  head.addEventListener("click", () => {
    AudioManager.unlock(); AudioManager.click();
    wrap.classList.toggle("is-open");
  });
  wrap.appendChild(head);
  wrap.appendChild(bodyEl);
  if (open) wrap.classList.add("is-open");
  return wrap;
}

/** 다음 행동 펄스 강조 */
export function coachify(node, { label = "여기를 눌러요" } = {}) {
  node.classList.add("coach");
  if (label) {
    const tip = el("div.coach__tip", { text: "👆 " + label });
    node.appendChild(tip);
  }
}
export function uncoach(node) {
  node.classList.remove("coach");
  const tip = node.querySelector(".coach__tip");
  if (tip) tip.remove();
}

/* -------------------------------------------------------------------------
   quiz(q, opts) — 선택형/복수선택형 문제 카드
   q: { prompt, choices, answer(index|index[]), type?"multiple_choice",
        rationale, hint, sourceRef }
   오답: 정답 비공개, 힌트 표시(3회 오답 시 강한 힌트), 재도전.
   정답: 해설 + 출처 표시, onResult(true).
   ------------------------------------------------------------------------- */
export function quiz(q, { layout = "column", confirmLabel = "정답 확인", confirmAlign = "center", onResult = null } = {}) {
  const isMulti = q.type === "multiple_choice";
  // 정답 위치 셔플: 표시 순서를 섞고 answer/wrongFeedback 인덱스를 재매핑
  const perm = q.choices.map((_, i) => i).sort(() => Math.random() - 0.5);
  const choices = perm.map((i) => q.choices[i]);
  const wrongFeedback = q.wrongFeedback ? perm.map((i) => q.wrongFeedback[i]) : null;
  const origAnswers = isMulti ? q.answer : [q.answer];
  const answers = origAnswers.map((a) => perm.indexOf(a));
  const picked = new Set();
  let wrongCount = 0;
  let done = false;

  const node = el("div.quiz");
  const list = el("div.quiz__choices" + (layout === "grid" ? ".quiz__choices--grid" : ""));
  const fb = el("div.feedback");
  const btns = [];

  choices.forEach((label, i) => {
    const b = el("button.choice", { type: "button" }, [
      el("span.choice__mark", { text: isMulti ? "☐" : "○" }),
      el("span", { text: label }),
    ]);
    b.addEventListener("click", () => {
      if (done) return;
      AudioManager.unlock(); AudioManager.click();
      if (isMulti) {
        if (picked.has(i)) picked.delete(i); else picked.add(i);
      } else {
        picked.clear(); picked.add(i);
      }
      btns.forEach((x, xi) => {
        const on = picked.has(xi);
        x.classList.toggle("is-picked", on);
        x.querySelector(".choice__mark").textContent = isMulti ? (on ? "☑" : "☐") : (on ? "●" : "○");
      });
      confirm.disabled = picked.size === 0 || (isMulti && picked.size !== answers.length);
    });
    btns.push(b);
    list.appendChild(b);
  });

  /* 찍기 방지: 오답 2회부터 '단서 다시 보기'를 눌러야 재제출 가능 */
  const clueBtn = button("단서 다시 보기", { variant: "sea", size: "sm", icon: "🔍", onClick: () => {
    clueRow.style.display = "none";
    fb.className = "feedback show feedback--no";
    fb.innerHTML = "🧭 <b>단서</b> · " + (q.clue || q.hint || "자료를 다시 읽어 봐요.") +
      "<br>💡 " + (q.hint || "") + "<br>단서를 읽었으면 다시 골라 보세요.";
    confirm.disabled = picked.size === 0 || (isMulti && picked.size !== answers.length);
  } });
  const clueRow = el("div.row", { style: { justifyContent: "center", display: "none" } }, [clueBtn]);

  const confirm = button(confirmLabel, { variant: "gold", icon: "🔍", disabled: true, onClick: () => {
    if (done) return;
    const ok = picked.size === answers.length && answers.every((a) => picked.has(a));
    if (!ok) {
      wrongCount++;
      stats.wrong++;
      AudioManager.wrong();
      // 오개념 피드백: 잘못 고른 선택지에 맞는 설명 (정답은 비공개)
      const firstWrong = [...picked].find((i) => !answers.includes(i));
      const wf = wrongFeedback && firstWrong != null ? wrongFeedback[firstWrong] : null;
      fb.className = "feedback show feedback--no";
      fb.innerHTML = "🤔 " + (wf || "다시 생각해 봐요.") +
        (wrongCount >= 3 ? "<br>💡 <b>힌트</b> · " + (q.hint || "단서를 다시 읽어 봐요.") : "");
      btns.forEach((x, xi) => { if (picked.has(xi)) x.classList.add("is-shake"); setTimeout(() => x.classList.remove("is-shake"), 400); });
      if (wrongCount >= 2) {
        confirm.disabled = true;
        clueRow.style.display = "flex";
        coachify(clueBtn, { label: null });
      }
      if (onResult) onResult(false);
      return;
    }
    done = true;
    AudioManager.correct();
    fb.className = "feedback show feedback--ok";
    fb.innerHTML = "✅ <b>정답!</b> " + (q.rationale || "") +
      (q.sourceRef ? ` <span class="src-tag">📎 ${q.sourceRef}</span>` : "");
    btns.forEach((x, xi) => { x.disabled = true; if (answers.includes(xi)) x.classList.add("is-correct"); });
    confirm.style.display = "none";
    if (onResult) onResult(true);
  } });
  if (isMulti) confirm.disabled = true;

  node.appendChild(list);
  node.appendChild(el("div.row", { style: { justifyContent: confirmAlign === "center" ? "center" : "flex-end", marginTop: "6px" } }, [confirm]));
  node.appendChild(clueRow);
  node.appendChild(fb);
  return { node };
}
