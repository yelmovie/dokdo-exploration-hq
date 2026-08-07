/* =========================================================================
   interactions.js — 조작형 활동 컴포넌트
   - makeDraggable: Pointer Events 드래그(터치/마우스 공용) + 탭 폴백
   - orderInteraction: 카드 순서 배열 (드래그 또는 탭으로 슬롯에 배치)
   - dropZones: 드롭 영역 판정 헬퍼
   태블릿 드래그 오작동 대비: 8px 이동 전에는 탭으로 처리, 스냅 배치.
   ========================================================================= */
import { el } from "../core/dom.js";
import AudioManager from "../managers/AudioManager.js";
import stats from "../managers/StatsManager.js";

/** 카드에 드래그+탭 동작 부여.
    onTap(), onDrop(dropEl|null) — dropEl 은 dropSelector 에 매칭된 요소 */
export function makeDraggable(card, { dropSelector, onTap, onDrop, stage }) {
  card.style.touchAction = "none";
  // 키보드 접근: Enter/Space = 탭과 동일 동작
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === " ") && onTap) {
      e.preventDefault();
      AudioManager.unlock(); AudioManager.click();
      onTap();
    }
  });
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
   routeDraw — 해도 위 항로 선긋기 활동 (4p 전용)
   bgSrc 해도 이미지 위에 부표 노드를 순서대로 탭하면 SVG 선이 실제로 이어지고
   배가 마지막 지점으로 이동한다. 잘못된 부표 → onWrong(다음에 이어야 할 index).
   nodes: [{id, label, x, y}] (% 좌표), order: [id...]
   ------------------------------------------------------------------------- */
export function routeDraw({ bgSrc, boatSrc, nodes, order, width = 700, height = 454, onWrong = null, onComplete = null }) {
  const wrap = el("div.routedraw", { style: { width: width + "px", height: height + "px" } });
  wrap.style.backgroundImage = `url("${encodeURI(bgSrc)}")`;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
  wrap.appendChild(svg);

  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  let step = 0;
  let done = false;

  // 배
  const boat = new Image();
  boat.src = boatSrc;
  boat.alt = "탐사선";
  boat.className = "routedraw__boat";
  const start = byId[order[0]];
  boat.style.left = start.x + "%";
  boat.style.top = start.y + "%";
  wrap.appendChild(boat);

  // 시작 부표 위 손가락 코치 — 첫 부표를 누르면 사라진다
  const finger = el("div.routedraw__finger", { text: "👇" });
  finger.style.left = start.x + "%";
  finger.style.top = start.y + "%";
  wrap.appendChild(finger);

  const btns = new Map();
  nodes.forEach((n) => {
    const b = el("button.routedraw__node", { type: "button", attrs: { "aria-label": n.label } }, [
      el("span.routedraw__dot"),
      el("span.routedraw__label", { text: n.label }),
    ]);
    b.style.left = n.x + "%";
    b.style.top = n.y + "%";
    b.addEventListener("click", () => {
      if (done) return;
      AudioManager.unlock();
      const expected = order[step];
      if (n.id !== expected) {
        stats.wrong++;
        AudioManager.wrong();
        b.classList.add("is-shake");
        setTimeout(() => b.classList.remove("is-shake"), 400);
        if (onWrong) onWrong(step);
        return;
      }
      AudioManager.click();
      b.classList.add("is-done");
      finger.remove();
      if (step > 0) {
        const prev = byId[order[step - 1]];
        const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
        ln.setAttribute("x1", prev.x); ln.setAttribute("y1", prev.y);
        ln.setAttribute("x2", n.x); ln.setAttribute("y2", n.y);
        ln.setAttribute("stroke", "#14568f");
        ln.setAttribute("stroke-width", "1.1");
        ln.setAttribute("stroke-dasharray", "2.6 1.6");
        ln.setAttribute("stroke-linecap", "round");
        ln.classList.add("routedraw__line");
        svg.appendChild(ln);
      }
      boat.style.left = n.x + "%";
      boat.style.top = n.y + "%";
      step++;
      if (step >= order.length) {
        done = true;
        AudioManager.correct();
        wrap.appendChild(el("div.routedraw__badge", { text: "⚓ 항로 복원! 울릉도 → 독도 약 87.4km" }));
        btns.forEach((x) => { x.querySelector(".routedraw__label").style.opacity = "1"; });
        if (onComplete) onComplete();
      }
    });
    btns.set(n.id, b);
    wrap.appendChild(b);
  });

  return { node: wrap };
}

/* -------------------------------------------------------------------------
   orderInteraction — 순서 배열 활동
   items: [{id, label}], answer: [id...]  (섞어서 트레이에 표시)
   카드 탭 → 첫 빈 슬롯에 배치 / 드래그 → 원하는 슬롯에 배치
   슬롯 카드 탭 → 트레이로 되돌림. 확인 → onResult(ok). 오답은 재도전.
   ------------------------------------------------------------------------- */
export function orderInteraction({ items, answer, slotW = 150, slotH = 80, onResult = null, freeOrder = false, confirmText = "순서 확인" }) {
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
      if (placed[i]) {
        const c = cardEl(placed[i]);
        // 슬롯 안에서는 슬롯 크기에 맞춰 축소 (글자가 밖으로 안 넘치게)
        Object.assign(c.style, { width: "100%", height: "100%", minHeight: "0", fontSize: "12px", lineHeight: "1.3", padding: "4px 4px", boxShadow: "none" });
        s.appendChild(c);
      }
    });
    trayRow.innerHTML = "";
    const inSlots = new Set(placed.filter(Boolean).map((p) => p.id));
    shuffled.forEach((item) => {
      if (!inSlots.has(item.id)) trayRow.appendChild(cardEl(item));
    });
    if (evicted && !inSlots.has(evicted.id)) { /* render 가 이미 트레이로 되돌림 */ }
    confirm.style.opacity = placed.some((p) => p === null) ? ".6" : "1"; // 비활성 대신 흐림 (누르면 안내)
  }

  const confirm = el("button.btn.btn--gold.btn--md", { type: "button" }, [
    el("span", { text: confirmText }),
  ]);
  const ready = () => !placed.some((p) => p === null);
  confirm.addEventListener("click", () => {
    if (done) return;
    AudioManager.unlock();
    // 카드가 덜 놓였을 때 눌러도 '왜 안 되는지' 알려준다 (disabled 무반응 방지)
    if (!ready()) {
      fb.className = "feedback show feedback--no";
      fb.textContent = "🃏 카드를 모두 슬롯에 놓은 뒤 눌러요!";
      return;
    }
    AudioManager.click();
    // freeOrder: 정답 없음 — 5칸 다 채우면 학습자의 배치 그대로 통과
    const ok = freeOrder || placed.every((p, i) => p && p.id === answer[i]);
    if (!ok) {
      stats.wrong++;
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
    fb.textContent = freeOrder ? "나만의 순서가 완성됐어요!" : "✅ 순서를 바르게 복원했어요!";
    confirm.style.display = "none";
    trayRow.style.display = "none";                 // 빈 트레이 공백 제거
    confirm.parentElement.style.display = "none";   // 확인 버튼 줄 공백 제거
    slots.forEach((s) => s.classList.add("is-correct"));
    if (onResult) onResult(true, placed.map((p) => p.id));
  });

  node.appendChild(slotsRow);
  node.appendChild(trayRow);
  node.appendChild(el("div.row", { style: { justifyContent: "center" } }, [confirm]));
  node.appendChild(fb);
  render();
  return { node };
}
