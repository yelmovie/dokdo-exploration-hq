/* =========================================================================
   3페이지 - 미션 지도 (MissionMapScene)
   화면 전체가 보물지도풍 해도(생성 에셋). 그 위에 미션 부표 노드가 항로를 따라
   놓인다. 패널은 우하단 상세 카드 하나뿐. HUD: 진행·도감.
   ========================================================================= */
import { el, assetImg } from "../core/dom.js";
import { buildScene, button, backButton, toast, coachify, speech } from "../components/ui.js";
import { DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { MISSIONS, isAllComplete, missionPageKey } from "../data/missions.js";
import { DEX_CARDS } from "../data/dexData.js";
import AudioManager from "../managers/AudioManager.js";

/* 배경 해도의 그려진 점선 항로(울릉도 좌하 → 독도 우상)를 따라 배치 */
const NODE_POS = {
  route:        { x: 33, y: 60 },
  geology:      { x: 43, y: 53 },
  history:      { x: 52, y: 46 },
  ecology:      { x: 61, y: 39 },
  briefing:     { x: 69, y: 32 },
  presentation: { x: 76, y: 24 },
};
const NODE_ICON = {
  route: "compassRose", geology: "coreSample", history: "oldBook",
  ecology: "ecoLeaf", briefing: "briefingDoc", presentation: "micIsland",
};

export default function MissionMapScene(ctx) {
  const cfg = PAGES.missionMap;
  const { root, layer } = buildScene({ bg: cfg.bg });
  const save = ctx.save;

  layer.appendChild(el("div.row", { style: { position: "absolute", left: "22px", top: "20px", gap: "12px", zIndex: 12 } }, [
    backButton(() => ctx.navigate("main")),
  ]));
  layer.appendChild(el("div", {
    style: {
      position: "absolute", left: "50%", top: "20px", transform: "translateX(-50%)", zIndex: 10,
      background: "rgba(20,54,92,.85)", backdropFilter: "blur(6px)",
      border: "1px solid rgba(255,255,255,.3)",
      color: "#fff", fontWeight: "800", fontSize: "19px",
      padding: "9px 26px", borderRadius: "999px", boxShadow: "var(--shadow)", whiteSpace: "nowrap",
    },
    text: "탐사 항로도 — 울릉도에서 독도까지",
  }));

  /* HUD: 진행 + 도감 */
  const doneCount = MISSIONS.filter((m) => save.isCompleted(m.key)).length;
  const dexCount = save.get("dex").length;
  layer.appendChild(el("div.row", { style: { position: "absolute", right: "22px", top: "20px", gap: "10px", zIndex: 12, alignItems: "center" } }, [
    el("div.hud-chip", { text: `미션 ${doneCount}/${MISSIONS.length} · ⭐${save.get("badges").length}` }),
    button(`도감 ${dexCount}/${DEX_CARDS.length}`, { variant: "gold", size: "sm", icon: "📖", onClick: () => ctx.navigate("dex") }),
  ]));

  /* ---- 미션 노드 (지도 위 직접 배치) ---- */
  let coached = false;
  MISSIONS.forEach((m) => {
    const p = NODE_POS[m.key];
    const completed = save.isCompleted(m.key);
    const unlocked = m.key === "presentation"
      ? isAllComplete(save.get("completedMissions")) || save.isUnlocked("presentation")
      : save.isUnlocked(m.key);

    const ring = completed ? "var(--green)" : unlocked ? "var(--gold)" : "rgba(90,100,110,.85)";
    const node = el("button", {
      type: "button",
      style: {
        position: "absolute", left: p.x + "%", top: p.y + "%", transform: "translate(-50%,-50%)",
        width: "88px", height: "88px", borderRadius: "50%", zIndex: 6,
        border: `4px solid ${ring}`, cursor: unlocked ? "pointer" : "not-allowed",
        background: "radial-gradient(circle at 40% 32%, rgba(255,255,255,.97), rgba(233,242,250,.92))",
        boxShadow: "0 8px 18px rgba(60,40,10,.35)", fontFamily: "inherit",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0", overflow: "visible",
      },
    });
    const ic = assetImg(DOKDO[NODE_ICON[m.key]], m.title);
    Object.assign(ic.style, {
      width: "70%", height: "70%", objectFit: "contain",
      filter: unlocked ? "none" : "grayscale(1) opacity(.55)",
    });
    node.appendChild(ic);
    node.appendChild(el("span", {
      style: {
        position: "absolute", right: "-7px", top: "-7px", width: "30px", height: "30px",
        borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "15px", fontWeight: "900", background: completed ? "var(--green)" : unlocked ? "var(--gold)" : "#5a646e",
        color: completed || !unlocked ? "#fff" : "#4a3305", boxShadow: "var(--shadow-sm)",
      },
      text: completed ? "✓" : unlocked ? String(m.order <= 5 ? m.order : "★") : "🔒",
    }));
    node.addEventListener("click", () => {
      AudioManager.unlock(); AudioManager.click();
      if (!unlocked) {
        toast(ctx.stage, m.key === "presentation"
          ? "브리핑 보드까지 완성하면 발표 준비가 열려요!"
          : "앞 단계 미션을 먼저 완료해요!");
        showDetail(m, false);
        return;
      }
      showDetail(m, true);
    });
    if (unlocked && !completed && !coached) { coachify(node, { label: null }); coached = true; }
    layer.appendChild(node);

    layer.appendChild(el("div", {
      style: {
        position: "absolute", left: p.x + "%", top: `calc(${p.y}% + 52px)`, transform: "translate(-50%,0)",
        fontSize: "12.5px", fontWeight: "900", color: "#fff", zIndex: 6,
        background: "rgba(20,54,92,.82)", padding: "2px 11px", borderRadius: "999px", whiteSpace: "nowrap",
        pointerEvents: "none",
      },
      text: m.title.replace(/^\d단계 /, ""),
    }));
  });

  /* ---- 탐사선: 다음 도전 노드 옆 ---- */
  const order = Object.keys(NODE_POS);
  const nextIdx = order.findIndex((k) => !save.isCompleted(k === "briefing" ? "briefing" : k));
  const boatAt = NODE_POS[order[Math.max(0, nextIdx === -1 ? order.length - 1 : nextIdx)]];
  const boat = assetImg(DOKDO.boat, "탐사선");
  Object.assign(boat.style, {
    position: "absolute", left: `calc(${boatAt.x}% - 104px)`, top: `calc(${boatAt.y}% + 26px)`,
    width: "88px", zIndex: 5, pointerEvents: "none", filter: "drop-shadow(0 6px 8px rgba(60,40,10,.4))",
  });
  boat.classList.add("floaty");
  layer.appendChild(boat);

  /* ---- 강치 안내 (좌하단, 울릉도 옆) ---- */
  placeGuide();
  function placeGuide() {
    const g = assetImg(DOKDO.otterSailor, "강치 항해사");
    Object.assign(g.style, { position: "absolute", left: "22px", top: "470px", width: "200px", height: "245px", objectFit: "contain", zIndex: 7 });
    layer.appendChild(g);
    const next = MISSIONS.find((m) => !save.isCompleted(m.key));
    speech(layer, {
      x: 60, y: 388,
      text: next ? `다음 목적지는 ‘${next.title.replace(/^\d단계 /, "")}’야! 부표를 눌러 봐.` : "모든 항로를 정복했어! 수료관으로 가자!",
      tail: "left", width: 250,
    });
  }

  /* ---- 우하단: 상세 패널 ---- */
  const detail = el("div.panel", {
    style: { position: "absolute", right: "26px", bottom: "26px", width: "330px", minHeight: "250px", zIndex: 8, padding: "18px", display: "flex", flexDirection: "column", gap: "9px" },
  });
  layer.appendChild(detail);

  function showDetail(m, unlocked) {
    const completed = save.isCompleted(m.key);
    const score = save.get("missionScores")[m.key] || 0;
    const stars = score >= 90 ? 3 : score >= 70 ? 2 : 1;
    detail.innerHTML = "";
    const head = el("div.row", { style: { alignItems: "center", gap: "10px" } });
    const hi = assetImg(DOKDO[NODE_ICON[m.key]], "");
    Object.assign(hi.style, { width: "46px", height: "46px", objectFit: "contain" });
    head.appendChild(hi);
    head.appendChild(el("div", { style: { fontSize: "18px", fontWeight: "900", color: "var(--navy)", lineHeight: "1.3" }, text: m.title }));
    detail.appendChild(head);
    detail.appendChild(el("div", { style: { fontSize: "13.5px", fontWeight: "700", color: "var(--ink-soft)", lineHeight: "1.55", wordBreak: "keep-all" }, text: m.desc }));
    detail.appendChild(el("div", { style: { fontSize: "13px", fontWeight: "800", color: "var(--navy)" },
      text: "난이도 " + "●".repeat(m.difficulty || 1) + "○".repeat(3 - (m.difficulty || 1)) +
        (completed ? `  ·  ${score}점 ` + "⭐".repeat(stars) : "") }));
    if (unlocked) {
      detail.appendChild(el("div.row", { style: { justifyContent: "center", marginTop: "auto" } }, [
        button(completed ? "다시 도전" : "미션 시작", { variant: "gold", size: "lg", onClick: () => ctx.navigate(missionPageKey(m.key)) }),
      ]));
    } else {
      detail.appendChild(el("div.pill", { style: { background: "#5a646e", alignSelf: "flex-start" }, text: "🔒 앞 단계를 먼저 완료해요" }));
    }
  }

  const next = MISSIONS.find((m) => !save.isCompleted(m.key) &&
    (m.key === "presentation" ? isAllComplete(save.get("completedMissions")) : save.isUnlocked(m.key)));
  showDetail(next || MISSIONS[0], !!next || save.isUnlocked(MISSIONS[0].key));

  if (isAllComplete(save.get("completedMissions")) && save.isCompleted("presentation")) {
    const goDone = button("탐사 수료관 입장", { variant: "green", size: "lg", icon: "🏛", onClick: () => ctx.navigate("completion") });
    coachify(goDone, { label: null });
    layer.appendChild(el("div", { style: { position: "absolute", right: "26px", top: "84px", zIndex: 8 } }, [goDone]));
  }

  return root;
}
