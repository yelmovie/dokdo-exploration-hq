/* =========================================================================
   3페이지 - 미션 지도 (MissionMapScene)
   해도형 패널 위 항로를 따라 미션 노드 5개(+발표·수료).
   잠금/해금, 완료 배지, 우측 상세 패널(설명·시작 버튼).
   ========================================================================= */
import { el, assetImg } from "../core/dom.js";
import { buildScene, placeAsset, button, backButton, toast, coachify } from "../components/ui.js";
import { DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { MISSIONS, isAllComplete, missionPageKey } from "../data/missions.js";
import AudioManager from "../managers/AudioManager.js";

/* 항로 위 노드 좌표 (지도 패널 내부 %) */
const NODE_POS = {
  route:        { x: 12, y: 66 },
  geology:      { x: 30, y: 38 },
  history:      { x: 50, y: 62 },
  ecology:      { x: 70, y: 34 },
  briefing:     { x: 88, y: 56 },
  presentation: { x: 88, y: 18 },
};

export default function MissionMapScene(ctx) {
  const cfg = PAGES.missionMap;
  const { root, layer } = buildScene({ bg: cfg.bg, veil: "dark" });
  const save = ctx.save;
  let selected = null;

  layer.appendChild(el("div.row", { style: { position: "absolute", left: "22px", top: "20px", gap: "12px", zIndex: 12 } }, [
    backButton(() => ctx.navigate("main")),
  ]));
  layer.appendChild(el("div", {
    style: {
      position: "absolute", left: "50%", top: "22px", transform: "translateX(-50%)", zIndex: 10,
      background: "rgba(20,54,92,.92)", color: "#fff", fontWeight: "900", fontSize: "21px",
      padding: "10px 30px", borderRadius: "999px", boxShadow: "var(--shadow)", whiteSpace: "nowrap",
    },
    text: "🗺️ 미션 지도 — 울릉도에서 독도까지",
  }));

  /* ---- 진행률 + 배지 칩 ---- */
  const doneCount = MISSIONS.filter((m) => save.isCompleted(m.key)).length;
  layer.appendChild(el("div.hud-chip", {
    style: { position: "absolute", right: "22px", top: "24px", zIndex: 12 },
    text: `진행 ${doneCount} / ${MISSIONS.length} · 배지 ${save.get("badges").length}개`,
  }));

  /* ---- 지도 패널 ---- */
  const map = el("div", {
    style: {
      position: "absolute", left: "40px", top: "88px", width: "860px", height: "560px", zIndex: 5,
      background: "linear-gradient(160deg,#cfe9fb 0%,#a8d4f2 55%,#8ec3e8 100%)",
      border: "4px solid #fff", borderRadius: "22px", boxShadow: "var(--shadow)", overflow: "hidden",
    },
  });
  layer.appendChild(map);

  /* 항로 점선 (SVG) */
  const order = ["route", "geology", "history", "ecology", "briefing", "presentation"];
  const pts = order.map((k) => NODE_POS[k]);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
  const path = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
  path.setAttribute("points", pts.map((p) => `${p.x},${p.y}`).join(" "));
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "rgba(20,86,143,.55)");
  path.setAttribute("stroke-width", "1.2");
  path.setAttribute("stroke-dasharray", "3 2.4");
  path.setAttribute("stroke-linecap", "round");
  svg.appendChild(path);
  map.appendChild(svg);

  /* 출발지/도착지 표시 */
  map.appendChild(el("div", { style: { position: "absolute", left: "2%", top: "82%", fontWeight: "900", fontSize: "15px", color: "var(--navy)" }, text: "🏝️ 울릉도 출발" }));
  const dokdoImg = assetImg(DOKDO.pinIsland, "독도");
  Object.assign(dokdoImg.style, { position: "absolute", right: "1%", top: "2%", width: "90px", height: "90px", objectFit: "contain" });
  map.appendChild(dokdoImg);

  /* 탐사선 장식 */
  const boat = assetImg(DOKDO.boat, "탐사선");
  Object.assign(boat.style, { position: "absolute", left: "3%", top: "42%", width: "110px", objectFit: "contain" });
  boat.classList.add("floaty");
  map.appendChild(boat);

  /* ---- 미션 노드 ---- */
  MISSIONS.forEach((m) => {
    const p = NODE_POS[m.key];
    const completed = save.isCompleted(m.key);
    const unlocked = m.key === "presentation"
      ? isAllComplete(save.get("completedMissions"))
      : save.isUnlocked(m.key);

    const node = el("button", {
      type: "button",
      style: {
        position: "absolute", left: p.x + "%", top: p.y + "%", transform: "translate(-50%,-50%)",
        width: "104px", height: "104px", borderRadius: "50%", border: "0", cursor: unlocked ? "pointer" : "not-allowed",
        background: completed
          ? "radial-gradient(circle at 35% 30%, #6ecb7e, #2f9e44)"
          : unlocked
            ? "radial-gradient(circle at 35% 30%, #ffd968, #c9962a)"
            : "radial-gradient(circle at 35% 30%, #b9c3cd, #7d8a97)",
        boxShadow: "var(--shadow)", fontFamily: "inherit",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "2px",
        color: completed ? "#fff" : unlocked ? "#4a3305" : "#e9eef3",
      },
    }, [
      el("span", { style: { fontSize: "30px" }, text: completed ? "✅" : unlocked ? m.icon : "🔒" }),
      el("span", { style: { fontSize: "12.5px", fontWeight: "900", lineHeight: "1.2", textAlign: "center", wordBreak: "keep-all" },
        text: m.order <= 5 ? `${m.order}단계` : "발표" }),
    ]);
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
    if (unlocked && !completed && !selected) { coachify(node, { label: null }); selected = m; }
    map.appendChild(node);

    map.appendChild(el("div", {
      style: {
        position: "absolute", left: p.x + "%", top: (p.y + 12) + "%", transform: "translate(-50%,0)",
        fontSize: "13.5px", fontWeight: "900", color: "var(--navy)",
        background: "rgba(255,255,255,.85)", padding: "2px 10px", borderRadius: "999px", whiteSpace: "nowrap",
      },
      text: m.title.replace(/^\d단계 /, ""),
    }));
  });

  /* ---- 우측: 상세 패널 ---- */
  const detail = el("div.panel", {
    style: { position: "absolute", right: "30px", top: "88px", width: "350px", minHeight: "300px", zIndex: 6, padding: "20px", display: "flex", flexDirection: "column", gap: "10px" },
  });
  layer.appendChild(detail);

  function showDetail(m, unlocked) {
    const completed = save.isCompleted(m.key);
    detail.innerHTML = "";
    detail.appendChild(el("div", { style: { fontSize: "34px" }, text: m.icon }));
    detail.appendChild(el("div", { style: { fontSize: "20px", fontWeight: "900", color: "var(--navy)" }, text: m.title }));
    detail.appendChild(el("div", { style: { fontSize: "14.5px", fontWeight: "700", color: "var(--ink-soft)", lineHeight: "1.6", wordBreak: "keep-all" }, text: m.desc }));
    detail.appendChild(el("div.pill", {
      style: { background: completed ? "var(--green)" : unlocked ? "var(--gold)" : "#7d8a97", color: completed ? "#fff" : unlocked ? "#5c3c05" : "#fff", alignSelf: "flex-start" },
      text: completed ? "✅ 완료 — 다시 도전 가능" : unlocked ? "⭐ 도전 가능" : "🔒 잠김",
    }));
    detail.appendChild(el("div", {
      style: { fontSize: "13px", fontWeight: "700", color: "var(--ink-soft)", lineHeight: "1.5", wordBreak: "keep-all" },
      text: "평가 기준: 자료 읽기 · 근거 선택 · 까닭 설명",
    }));
    if (unlocked) {
      const start = button(completed ? "다시 도전" : "미션 시작", { variant: "gold", size: "lg", icon: "🚀", onClick: () => ctx.navigate(missionPageKey(m.key)) });
      detail.appendChild(el("div.row", { style: { justifyContent: "center", marginTop: "auto" } }, [start]));
    }
  }

  /* 기본 선택: 다음 도전할 미션 */
  const next = MISSIONS.find((m) => !save.isCompleted(m.key) &&
    (m.key === "presentation" ? isAllComplete(save.get("completedMissions")) : save.isUnlocked(m.key)));
  showDetail(next || MISSIONS[0], !!next || save.isUnlocked(MISSIONS[0].key));

  /* ---- 하단: 수료관 이동 (전체 완료 시) ---- */
  if (isAllComplete(save.get("completedMissions")) && save.isCompleted("presentation")) {
    const goDone = button("탐사 수료관 입장", { variant: "green", size: "lg", icon: "🏛️", onClick: () => ctx.navigate("completion") });
    coachify(goDone, { label: null });
    layer.appendChild(el("div", { style: { position: "absolute", right: "30px", bottom: "40px", zIndex: 8 } }, [goDone]));
  }

  return root;
}
