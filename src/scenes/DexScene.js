/* =========================================================================
   도감 - 독도 대백과 (DexScene, #dex)
   미션·관찰·기록에서 모은 카드를 한눈에. 잠긴 카드는 흐림+? 로 표시.
   ========================================================================= */
import { el, assetImg } from "../core/dom.js";
import { buildScene, button, backButton, modal } from "../components/ui.js";
import PAGES from "../config/pageConfig.js";
import { DEX_CARDS, DEX_GROUPS } from "../data/dexData.js";
import AudioManager from "../managers/AudioManager.js";

export default function DexScene(ctx) {
  const cfg = PAGES.dex;
  const { root, layer } = buildScene({ bg: cfg.bg, veil: "dark" });
  const owned = new Set(ctx.save.get("dex"));

  layer.appendChild(el("div.row", { style: { position: "absolute", left: "22px", top: "20px", gap: "12px", zIndex: 12 } }, [
    backButton(() => ctx.navigate("missionMap")),
  ]));
  layer.appendChild(el("div", {
    style: {
      position: "absolute", left: "50%", top: "20px", transform: "translateX(-50%)", zIndex: 10,
      background: "rgba(20,54,92,.85)", backdropFilter: "blur(6px)", border: "1px solid rgba(255,255,255,.3)",
      color: "#fff", fontWeight: "800", fontSize: "19px",
      padding: "9px 26px", borderRadius: "999px", boxShadow: "var(--shadow)", whiteSpace: "nowrap",
    },
    text: `독도 대백과 — ${owned.size} / ${DEX_CARDS.length} 수집`,
  }));

  const grid = el("div.dex-grid", { style: { position: "absolute", left: "60px", right: "60px", top: "92px", bottom: "40px", overflowY: "auto", padding: "6px", zIndex: 6 } });
  layer.appendChild(grid);

  DEX_CARDS.forEach((c) => {
    const has = owned.has(c.id);
    const g = DEX_GROUPS[c.group];
    const img = assetImg(c.img, c.title);
    if (!c.photo) img.style.objectFit = "contain";
    const card = el("button.dex-card" + (has ? "" : ".is-locked"), { type: "button" }, [
      el("span.dex-card__group", { text: g.label, style: { background: g.color } }),
      img,
      el("div.dex-card__name", { text: has ? c.title : "???" }),
    ]);
    card.addEventListener("click", () => {
      AudioManager.unlock(); AudioManager.click();
      if (!has) {
        const md0 = modal(ctx.stage, {
          title: "아직 발견하지 못한 카드", icon: "🔒",
          bodyHtml: `<div style="font-size:15px;font-weight:700;color:var(--ink);line-height:1.6;word-break:keep-all">획득 방법 · ${c.how}</div>`,
          buttons: [button("알겠어요", { variant: "ghost", onClick: () => md0.close() })],
        });
        return;
      }
      const big = assetImg(c.img, c.title);
      Object.assign(big.style, c.photo
        ? { width: "420px", height: "260px", objectFit: "cover", borderRadius: "12px", boxShadow: "var(--shadow-sm)" }
        : { width: "150px", height: "150px", objectFit: "contain" });
      const body = el("div.col", { style: { gap: "10px", alignItems: "center", maxWidth: "470px" } }, [
        big,
        el("div.pill", { style: { background: g.color }, text: g.label + " 카드" }),
        el("div", { style: { fontSize: "15px", fontWeight: "700", color: "var(--ink)", lineHeight: "1.65", wordBreak: "keep-all", textAlign: "center" }, text: c.desc }),
        el("div.src-tag", { text: "📎 " + c.source }),
      ]);
      const md = modal(ctx.stage, { title: c.title, icon: "📖", body,
        buttons: [button("닫기", { variant: "green", onClick: () => md.close() })] });
    });
    grid.appendChild(card);
  });

  return root;
}
