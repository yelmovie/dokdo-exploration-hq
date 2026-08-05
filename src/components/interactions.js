/* =========================================================================
   interactions.js — 조작형 활동 컴포넌트
   - makeDraggable: Pointer Events 드래그(터치/마우스 공용) + 탭 폴백
   - orderInteraction: 카드 순서 배열 (드래그 또는 탭으로 슬롯에 배치)
   - dropZones: 드롭 영역 판정 헬퍼
   태블릿 드래그 오작동 대비: 8px 이동 전에는 탭으로 처리, 스냅 배치.
   ========================================================================= */
import { el } from "../core/dom.js";
import AudioManager from "../managers/AudioManager.js";

/** 카드에 드래그+탭 동작 부여.
    onTap(), onDrop(dropEl|null) — dropEl 은 dropSelector 에 매칭된 요소 */
export function makeDraggable(card, { dropSelector, onTap, onDrop, stage }) {
  card.style.touchAction = "none";
  let startX = 0, startY = 0, dragging = false, ghost = null, down = false;

  card.addEventListener("pointerdown", (e) => {
    if (card.classList.contains("is-locked")) return;
    e.preventDefault();
    try { card.setPointerCapture(e.pointerId); } catch { /* 캡처 실패해도 진행 */ }
    startX = e.clientX; startY = e.clientY; dragging = false; down = true;
  });

  card.addEventListener("pointermove", (e) => {
    if (!down) return;
    const dx = e.clientX - startX, dy = e.clientY - startY;
    if (!dragging && Math.hypot(dx, dy) < 8) return;
    if (!dragging) {
      dragging = true;
      ghost = card.cloneNode(true);
      ghost.classList.add("drag-ghost");
      const r = card.getBoundingClientRect();
      ghost.style.width = r.width + "px";
      document.body.appendChild(ghost);
      card.classList.add("is-dragsrc");
    }
    ghost.style.left = e.clientX + "px";
    ghost.style.top = e.clientY + "px";
    // 드롭 대상 하이라이트
    document.querySelectorAll(dropSelector).forEach((z) => z.classList.remove("drop-hover"));
    const target = dropAt(e.clientX, e.clientY, dropSelector);
    if (target) target.classList.add("drop-hover");
  });

  function finish(e) {
    if (!down) return;
    down = false;
    try { card.releasePointerCapture(e.pointerId); } catch { /* 무시 */ }
    document.querySelectorAll(dropSelector).forEach((z) => z.classList.remove("drop-hover"));
    if (ghost) { ghost.remove(); ghost = null; }
    card.classList.remove("is-dragsrc");
    if (dragging) {
      const target = dropAt(e.clientX, e.clientY, dropSelector);
      if (onDrop) onDrop(target);
    } else if (onTap) {
      AudioManager.unlock(); AudioManager.click();
      onTap();
    }
    dragging = false;
  }
  card.addEventListener("pointerup", finish);
  card.addEventListener("pointercancel", (e) => {
    if (ghost) { ghost.remove(); ghost = null; }
    card.classList.remove("is-dragsrc");
    dragging = false; down = false;
    try { card.releasePointerCapture(e.pointerId); } catch { /* 무시 */ }
  });
}

function dropAt(x, y, selector) {
  for (const z of document.querySelectorAll(selector)) {
    const r = z.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return z;
  }
  return null;
}

/* -------------------------------------------------------------------------
   orderInteraction — 순서 배열 활동
   items: [{id, label}], answer: [id...]  (섞어서 트레이에 표시)
   카드 탭 → 첫 빈 슬롯에 배치 / 드래그 → 원하는 슬롯에 배치
   슬롯 카드 탭 → 트레이로 되돌림. 확인 → onResult(ok). 오답은 재도전.
   ------------------------------------------------------------------------- */
export function orderInteraction({ items, answer, slotW = 150, slotH = 80, onResult = null }) {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  const node = el("div.order");
  const fb = el("div.feedback");
  const slotsRow = el("div.order__slots");
  const trayRow = el("div.order__tray");
  const placed = new Array(answer.length).fill(null); // slotIndex -> item
  let done = false;
  const uid = "oz-" + Math.random().toString(36).slice(2, 8);

  const slots = answer.map((_, i) => {
    const s = el("div.order__slot." + uid, { style: { width: slotW + "px", minHeight: slotH + "px" } }, [
      el("span.order__slotnum", { text: String(i + 1) }),
    ]);
    s.dataset.slot = String(i);
    slotsRow.appendChild(s);
    return s;
  });

  function cardEl(item) {
    const c = el("div.order__card", { text: item.label });
    c.dataset.id = item.id;
    makeDraggable(c, {
      dropSelector: ".order__slot." + uid,
      onTap: () => {
        if (done) return;
        const inSlot = placed.findIndex((p) => p && p.id === item.id);
        if (inSlot >= 0) returnToTray(inSlot);
        else placeInSlot(item, placed.findIndex((p) => p === null));
      },
      onDrop: (slot) => {
        if (done || !slot) return;
        placeInSlot(item, Number(slot.dataset.slot));
      },
    });
    return c;
  }

  function placeInSlot(item, si) {
    if (si < 0 || si >= placed.length) return;
    const cur = placed.findIndex((p) => p && p.id === item.id);
    if (cur >= 0) placed[cur] = null;              // 슬롯 간 이동
    const evicted = placed[si];                    // 자리 차 있으면 기존 카드는 트레이로

    placed[si] = item;
    render(evicted);
  }

  function returnToTray(si) {
    placed[si] = null;
    render();
  }

  function render(evicted = null) {
    slots.forEach((s, i) => {
      s.querySelectorAll(".order__card").forEach((c) => c.remove());
      s.classList.toggle("is-filled", !!placed[i]);
      if (placed[i]) s.appendChild(cardEl(placed[i]));
    });
    trayRow.innerHTML = "";
    const inSlots = new Set(placed.filter(Boolean).map((p) => p.id));
    shuffled.forEach((item) => {
      if (!inSlots.has(item.id)) trayRow.appendChild(cardEl(item));
    });
    if (evicted && !inSlots.has(evicted.id)) { /* render 가 이미 트레이로 되돌림 */ }
    confirm.disabled = placed.some((p) => p === null);
  }

  const confirm = el("button.btn.btn--gold.btn--md", { type: "button" }, [
    el("span.btn__icon", { text: "🔍" }), el("span", { text: "순서 확인" }),
  ]);
  confirm.disabled = true;
  confirm.addEventListener("click", () => {
    if (done) return;
    AudioManager.unlock(); AudioManager.click();
    const ok = placed.every((p, i) => p && p.id === answer[i]);
    if (!ok) {
      AudioManager.wrong();
      fb.className = "feedback show feedback--no";
      fb.textContent = "🤔 순서가 아직 맞지 않아요. 카드를 눌러 되돌리고 단서를 다시 읽어 봐요.";
      slotsRow.classList.add("is-shake");
      setTimeout(() => slotsRow.classList.remove("is-shake"), 400);
      if (onResult) onResult(false);
      return;
    }
    done = true;
    AudioManager.correct();
    fb.className = "feedback show feedback--ok";
    fb.textContent = "✅ 순서를 바르게 복원했어요!";
    confirm.style.display = "none";
    slots.forEach((s) => s.classList.add("is-correct"));
    if (onResult) onResult(true);
  });

  node.appendChild(slotsRow);
  node.appendChild(trayRow);
  node.appendChild(el("div.row", { style: { justifyContent: "center" } }, [confirm]));
  node.appendChild(fb);
  render();
  return { node };
}
