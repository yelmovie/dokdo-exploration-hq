/* =========================================================================
   3페이지 - 미션 지도 (MissionMapScene)
   해도(항해 지도) 콘셉트: 종이빛 바다, 위도선, 곡선 점선 항로, 나침반 로즈.
   노드 = 아이콘 원형 + 상태 링. 탐사선이 진행 위치를 따라간다.
   ========================================================================= */
import { el, assetImg } from "../core/dom.js";
import { buildScene, button, backButton, toast, coachify } from "../components/ui.js";
import { DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { MISSIONS, isAllComplete, missionPageKey } from "../data/missions.js";
import AudioManager from "../managers/AudioManager.js";

/* 항로 곡선 위 노드 좌표 (지도 패널 내부 %) — 울릉도(좌하) → 독도(우상) */
const NODE_POS = {
  route:        { x: 13, y: 68 },
  geology:      { x: 30, y: 40 },
  history:      { x: 49, y: 64 },
  ecology:      { x: 67, y: 34 },
  briefing:     { x: 84, y: 55 },
  presentation: { x: 90, y: 20 },
};
const NODE_ICON = {
  route: "compassRose", geology: "coreSample", history: "oldBook",
  ecology: "ecoLeaf", briefing: "briefingDoc", presentation: "micIsland",
};

export default function MissionMapScene(ctx) {
  const cfg = PAGES.missionMap;
  const { root, layer } = buildScene({ bg: cfg.bg, veil: "dark" });
  const save = ctx.save;

  layer.appendChild(el("div.row", { style: { position: "absolute", left: "22px", top: "20px", gap: "12px", zIndex: 12 } }, [
    backButton(() => ctx.navigate("main")),
  ]));
  layer.appendChild(el("div", {
    style: {
      position: "absolute", left: "50%", top: "22px", transform: "translateX(-50%)", zIndex: 10,
      background: "rgba(14,38,64,.72)", backdropFilter: "blur(8px)",
      border: "1px solid rgba(255,255,255,.25)",
      color: "#fff", fontWeight: "800", fontSize: "19px", letterSpacing: "-0.01em",
      padding: "10px 28px", borderRadius: "999px", boxShadow: "var(--shadow)", whiteSpace: "nowrap",
    },
    text: "탐사 항로도 — 울릉도에서 독도까지",
  }));

  const doneCount = MISSIONS.filter((m) => save.isCompleted(m.key)).length;
  layer.appendChild(el("div.hud-chip", {
    style: { position: "absolute", right: "22px", top: "24px", zIndex: 12 },
    text: `진행 ${doneCount} / ${MISSIONS.length} · 배지 ${save.get("badges").length}`,
  }));

  /* ---- 해도 패널 ---- */
  const map = el("div", {
    style: {
      position: "absolute", left: "40px", top: "88px", width: "860px", height: "560px", zIndex: 5,
      background: "linear-gradient(158deg, #dceefb 0%, #bcdcf2 40%, #9cc8e8 100%)",
      border: "1px solid rgba(255,255,255,.85)", borderRadius: "22px",
      boxShadow: "0 14px 36px rgba(13,39,67,.3), inset 0 0 80px rgba(31,122,194,.12)",
      overflow: "hidden",
    },
  });
  layer.appendChild(map);

  /* 해도 장식 + 곡선 항로 (SVG) */
  const order = ["route", "geology", "history", "ecology", "briefing", "presentation"];
  const pts = order.map((k) => NODE_POS[k]);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.style.cssText = "position:absolute;inset:0;width:100%;height:100%;pointer-events:none";
  // 위도·경도선 (은은하게)
  for (let i = 1; i < 5; i++) {
    const ln = document.createElementNS("http://www.w3.org/2000/svg", "line");
    ln.setAttribute("x1", "0"); ln.setAttribute("x2", "100");
    ln.setAttribute("y1", String(i * 20)); ln.setAttribute("y2", String(i * 20));
    ln.setAttribute("stroke", "rgba(20,86,143,.10)"); ln.setAttribute("stroke-width", "0.3");
    svg.appendChild(ln);
    const lv = document.createElementNS("http://www.w3.org/2000/svg", "line");
    lv.setAttribute("y1", "0"); lv.setAttribute("y2", "100");
    lv.setAttribute("x1", String(i * 20)); lv.setAttribute("x2", String(i * 20));
    lv.setAttribute("stroke", "rgba(20,86,143,.10)"); lv.setAttribute("stroke-width", "0.3");
    svg.appendChild(lv);
  }
  // 곡선 항로: 시작점 + 각 노드를 부드러운 Q 곡선으로 연결
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1], p1 = pts[i];
    const mx = (p0.x + p1.x) / 2;
    d += ` Q ${mx} ${p0.y}, ${mx} ${(p0.y + p1.y) / 2} T ${p1.x} ${p1.y}`;
  }
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", d);
  path.setAttribute("fill", "none");
  path.setAttribute("stroke", "rgba(20,86,143,.5)");
  path.setAttribute("stroke-width", "0.9");
  path.setAttribute("stroke-dasharray", "2.2 1.8");
  path.setAttribute("stroke-linecap", "round");
  svg.appendChild(path);
  map.appendChild(svg);

  /* 장식: 나침반 로즈 / 울릉도 / 독도 */
  const rose = assetImg(DOKDO.compassRose, "나침반");
  Object.assign(rose.style, { position: "absolute", right: "18px", bottom: "16px", width: "92px", opacity: ".88", pointerEvents: "none" });
  map.appendChild(rose);
  const ulleung = assetImg(DOKDO.islandGreen, "울릉도");
  Object.assign(ulleung.style, { position: "absolute", left: "1.5%", top: "76%", width: "104px", pointerEvents: "none" });
  map.appendChild(ulleung);
  map.appendChild(el("div", { style: { position: "absolute", left: "2.5%", top: "93%", fontWeight: "800", fontSize: "13.5px", color: "var(--navy)", background: "rgba(255,255,255,.7)", padding: "1px 10px", borderRadius: "999px" }, text: "울릉도 출발" }));
  const dokdo = assetImg(DOKDO.pinIsland, "독도");
  Object.assign(dokdo.style, { position: "absolute", right: "1%", top: "1%", width: "88px", pointerEvents: "none" });
  map.appendChild(dokdo);

  /* 탐사선: 다음 도전 노드 근처에 배치 */
  const nextIdx = order.findIndex((k) => !save.isCompleted(k));
  const boatAt = pts[Math.max(0, nextIdx === -1 ? pts.length - 1 : nextIdx)];
  const boat = assetImg(DOKDO.boat, "탐사선");
  Object.assign(boat.style, {
    position: "absolute", left: `calc(${boatAt.x}% - 96px)`, top: `calc(${boatAt.y}% + 18px)`,
    width: "84px", pointerEvents: "none", filter: "drop-shadow(0 6px 8px rgba(13,39,67,.3))",
  });
  boat.classList.add("floaty");
  map.appendChild(boat);

  /* ---- 미션 노드 ---- */
  let coached = false;
  MISSIONS.forEach((m) => {
    const p = NODE_POS[m.key];
    const completed = save.isCompleted(m.key);
    const unlocked = m.key === "presentation"
      ? isAllComplete(save.get("completedMissions")) || save.isUnlocked("presentation")
      : save.isUnlocked(m.key);

    const ring = completed ? "var(--green)" : unlocked ? "var(--gold)" : "rgba(125,138,151,.9)";
    const node = el("button", {
      type: "button",
      style: {
        position: "absolute", left: p.x + "%", top: p.y + "%", transform: "translate(-50%,-50%)",
        width: "96px", height: "96px", borderRadius: "50%",
        border: `4px solid ${ring}`, cursor: unlocked ? "pointer" : "not-allowed",
        background: "rgba(252,254,255,.9)",
        boxShadow: "0 8px 20px rgba(13,39,67,.28)", fontFamily: "inherit",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "0", overflow: "visible",
      },
    });
    const ic = assetImg(DOKDO[NODE_ICON[m.key]], m.title);
    Object.assign(ic.style, {
      width: "72%", height: "72%", objectFit: "contain",
      filter: unlocked ? "none" : "grayscale(1) opacity(.5)",
    });
    node.appendChild(ic);
    // 상태 스티커
    node.appendChild(el("span", {
      style: {
        position: "absolute", right: "-6px", top: "-6px", width: "32px", height: "32px",
        borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "16px", background: completed ? "var(--green)" : unlocked ? "var(--gold)" : "#7d8a97",
        color: "#fff", boxShadow: "var(--shadow-sm)",
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
    map.appendChild(node);

    map.appendChild(el("div", {
      style: {
        position: "absolute", left: p.x + "%", top: (p.y + 11.5) + "%", transform: "translate(-50%,0)",
        fontSize: "13px", fontWeight: "800", color: "var(--navy)",
        background: "rgba(255,255,255,.78)", padding: "2px 11px", borderRadius: "999px", whiteSpace: "nowrap",
        pointerEvents: "none",
      },
      text: m.title.replace(/^\d단계 /, ""),
    }));
  });

  /* ---- 우측: 상세 패널 ---- */
  const detail = el("div.panel", {
    style: { position: "absolute", right: "30px", top: "88px", width: "350px", minHeight: "330px", zIndex: 6, padding: "20px", display: "flex", flexDirection: "column", gap: "10px" },
  });
  layer.appendChild(detail);

  function showDetail(m, unlocked) {
    const completed = save.isCompleted(m.key);
    const score = save.get("missionScores")[m.key] || 0;
    const stars = score >= 90 ? 3 : score >= 70 ? 2 : 1;
    detail.innerHTML = "";
    const head = el("div.row", { style: { alignItems: "center", gap: "10px" } });
    const hi = assetImg(DOKDO[NODE_ICON[m.key]], "");
    Object.assign(hi.style, { width: "52px", height: "52px", objectFit: "contain" });
    head.appendChild(hi);
    head.appendChild(el("div", { style: { fontSize: "19px", fontWeight: "900", color: "var(--navy)", lineHeight: "1.3" }, text: m.title }));
    detail.appendChild(head);
    detail.appendChild(el("div", { style: { fontSize: "14.5px", fontWeight: "700", color: "var(--ink-soft)", lineHeight: "1.6", wordBreak: "keep-all" }, text: m.desc }));
    detail.appendChild(el("div", { style: { fontSize: "13.5px", fontWeight: "800", color: "var(--navy)" },
      text: "난이도 " + "●".repeat(m.difficulty || 1) + "○".repeat(3 - (m.difficulty || 1)) +
        (completed ? `  ·  ${score}점 ` + "⭐".repeat(stars) : "") }));
    detail.appendChild(el("div.pill", {
      style: { background: completed ? "var(--green)" : unlocked ? "var(--gold)" : "#7d8a97", color: completed ? "#fff" : unlocked ? "#5c3c05" : "#fff", alignSelf: "flex-start" },
      text: completed ? "완료 — 다시 도전 가능" : unlocked ? "도전 가능" : "잠김",
    }));
    detail.appendChild(el("div", {
      style: { fontSize: "12.5px", fontWeight: "700", color: "var(--ink-soft)", lineHeight: "1.5", wordBreak: "keep-all" },
      text: "평가 기준: 자료 읽기 · 근거 선택 · 까닭 설명",
    }));
    if (unlocked) {
      const start = button(completed ? "다시 도전" : "미션 시작", { variant: "gold", size: "lg", onClick: () => ctx.navigate(missionPageKey(m.key)) });
      detail.appendChild(el("div.row", { style: { justifyContent: "center", marginTop: "auto" } }, [start]));
    }
  }

  const next = MISSIONS.find((m) => !save.isCompleted(m.key) &&
    (m.key === "presentation" ? isAllComplete(save.get("completedMissions")) : save.isUnlocked(m.key)));
  showDetail(next || MISSIONS[0], !!next || save.isUnlocked(MISSIONS[0].key));

  /* ---- 수료관 입장 (전체 완료 시) ---- */
  if (isAllComplete(save.get("completedMissions")) && save.isCompleted("presentation")) {
    const goDone = button("탐사 수료관 입장", { variant: "green", size: "lg", icon: "🏛", onClick: () => ctx.navigate("completion") });
    coachify(goDone, { label: null });
    layer.appendChild(el("div", { style: { position: "absolute", right: "30px", bottom: "40px", zIndex: 8 } }, [goDone]));
  }

  return root;
}
