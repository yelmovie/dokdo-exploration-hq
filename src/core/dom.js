/* =========================================================================
   dom.js — DOM 생성 헬퍼
   el("div.a.b", { text, html, style, onClick, ...attrs }, [children])
   ========================================================================= */

export function el(selector, props = {}, children = []) {
  const [tag, ...classes] = selector.split(".");
  const node = document.createElement(tag || "div");
  if (classes.length) node.className = classes.join(" ");

  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "style" && typeof v === "object") Object.assign(node.style, v);
    else if (k === "attrs" && typeof v === "object") {
      for (const [ak, av] of Object.entries(v)) node.setAttribute(ak, av);
    } else if (k.startsWith("on") && typeof v === "function") {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else if (k in node && k !== "list") {
      try { node[k] = v; } catch { node.setAttribute(k, v); }
    } else {
      node.setAttribute(k, v);
    }
  }

  for (const c of [].concat(children)) {
    if (c == null) continue;
    node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
  }
  return node;
}

/** 에셋 이미지 — 로딩 실패 시 placeholder로 대체하고 앱은 계속 진행 */
export function assetImg(src, alt = "") {
  const img = new Image();
  img.alt = alt;
  img.draggable = false;
  img.addEventListener("error", () => {
    img.style.visibility = "hidden";
    console.warn("[asset] 로딩 실패:", src);
  }, { once: true });
  img.src = src;
  return img;
}
