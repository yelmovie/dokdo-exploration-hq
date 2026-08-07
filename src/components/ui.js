/* =========================================================================
   ui.js — 공통 UI 컴포넌트 (버튼·모달·토스트·퀴즈·수납 패널·코치 강조)
   모든 버튼/패널은 CSS 구현. 이미지 에셋은 배경·캐릭터·명패·배지만 사용.
   ========================================================================= */
import { el, assetImg } from "../core/dom.js";
import AudioManager from "../managers/AudioManager.js";

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

/** 캐릭터/오브젝트 배치 (float: 둥실, shadow: 바닥 그림자 타원) */
export function placeAsset(layer, src, { x, y, w, h, alt = "", float = false, z = 2, shadow = false } = {}) {
  if (shadow) {
    const sh = el("div.floor-shadow", { style: {
      left: (x + w * 0.14) + "px", top: (y + h - 14) + "px",
      width: (w * 0.72) + "px", height: "26px", zIndex: String(z - 1),
    } });
    layer.appendChild(sh);
  }
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

/** 리본형 씬 타이틀 (상단 중앙) */
export function titleRibbon(layer, text, { top = 18 } = {}) {
  const r = el("div.ribbon", { text });
  const wrap = el("div", { style: { position: "absolute", left: "50%", top: top + "px", transform: "translateX(-50%)", zIndex: 10 } }, [r]);
  layer.appendChild(wrap);
  return wrap;
}

/** 정답 도장 연출 */
export function stamp(container, text = "통과!") {
  const s = el("div.stamp", { text });
  container.appendChild(s);
  setTimeout(() => { s.style.transition = "opacity .4s"; s.style.opacity = "0"; setTimeout(() => s.remove(), 420); }, 1400);
}

/** 도감 카드 획득 비행 연출 — 화면 우상단으로 날아감 */
export function flyToDex(stage, fromEl, icon = "📖") {
  const sr = stage.getBoundingClientRect();
  const fr = (fromEl || stage).getBoundingClientRect();
  const scale = sr.width / 1280;
  const card = el("div.fly-card", { text: icon, style: {
    left: ((fr.left - sr.left) / scale + 20) + "px",
    top: ((fr.top - sr.top) / scale + 20) + "px",
  } });
  stage.appendChild(card);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.style.left = "1180px";
      card.style.top = "26px";
      card.style.transform = "scale(.4) rotate(14deg)";
      card.style.opacity = "0.2";
    });
  });
  setTimeout(() => card.remove(), 900);
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

/** 캐릭터 말풍선 — 타이핑 애니메이션으로 한 글자씩 출력. 탭하면 닫힘 */
export function speech(layer, { x, y, text, tail = "left", width = 250 } = {}) {
  const b = el("div.speech.speech--" + tail, {
    style: { position: "absolute", left: x + "px", top: y + "px", maxWidth: width + "px", zIndex: 15 },
  });
  // 레이아웃 높이 고정용 투명 전체 텍스트 + 그 위에 타이핑 텍스트
  const ghost = el("span", { text, style: { visibility: "hidden", display: "block" } });
  const live = el("span", { style: { position: "absolute", inset: "11px 15px" } });
  b.appendChild(ghost);
  b.appendChild(live);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let i = 0, timer = 0;
  if (reduced) {
    live.textContent = text;
  } else {
    timer = setInterval(() => {
      i++;
      live.textContent = text.slice(0, i);
      if (i >= text.length) clearInterval(timer);
    }, 38);
  }
  b.addEventListener("pointerdown", () => {
    if (i < text.length && !reduced) { // 첫 탭: 전체 문장 즉시 표시
      clearInterval(timer);
      i = text.length;
      live.textContent = text;
      return;
    }
    b.style.opacity = "0";
    setTimeout(() => b.remove(), 300);
  });
  layer.appendChild(b);
  return b;
}

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
    stamp(node, "통과!");
    fb.className = "feedback show feedback--ok";
    fb.textContent = "✅ 정답!";
    btns.forEach((x, xi) => { x.disabled = true; if (answers.includes(xi)) x.classList.add("is-correct"); });
    confirm.style.display = "none";
    clueRow.style.display = "none";
    // 해설은 별도 카드로 — 패널은 문제 크기만 유지 (여백 최소화)
    if (q.rationale) {
      const stageEl = document.getElementById("stage") || document.body;
      const md = modal(stageEl, {
        title: "정답! 왜 그럴까요?", icon: "💡",
        bodyHtml: `<div style="font-size:16.5px;font-weight:700;color:var(--ink);line-height:1.65;word-break:keep-all">${q.rationale}${q.sourceRef ? ` <span class="src-tag">📎 ${q.sourceRef}</span>` : ""}</div>`,
        buttons: [button("알겠어요!", { variant: "green", onClick: () => md.close() })],
      });
    }
    if (onResult) onResult(true);
  } });
  if (isMulti) confirm.disabled = true;

  node.appendChild(list);
  node.appendChild(el("div.row", { style: { justifyContent: confirmAlign === "center" ? "center" : "flex-end", marginTop: "6px" } }, [confirm]));
  node.appendChild(clueRow);
  node.appendChild(fb);
  return { node };
}
