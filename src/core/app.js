/* =========================================================================
   app.js — 진입점 + 해시 라우터 (#씬키 딥링크) + fitStage 비율 스케일
   - 씬 전환 잠금(연타 방지), 이전 씬 disposer 실행, 잔여 모달 정리
   - fitStage: rAF + setTimeout 재시도, visualViewport 0 폴백, scale 0 방지
   ========================================================================= */
import save from "../managers/SaveManager.js";
import AudioManager from "../managers/AudioManager.js";
import PAGES from "../config/pageConfig.js";

import MainTitleScene from "../scenes/MainTitleScene.js";
import BriefingScene from "../scenes/BriefingScene.js";
import MissionMapScene from "../scenes/MissionMapScene.js";
import RouteRestoreScene from "../scenes/RouteRestoreScene.js";
import GeologyAnalysisScene from "../scenes/GeologyAnalysisScene.js";
import HistoricalArchiveScene from "../scenes/HistoricalArchiveScene.js";
import EcologyProtectionScene from "../scenes/EcologyProtectionScene.js";
import BriefingBoardBuildScene from "../scenes/BriefingBoardBuildScene.js";
import PresentationPrepScene from "../scenes/PresentationPrepScene.js";
import CompletionGalleryScene from "../scenes/CompletionGalleryScene.js";
import DexScene from "../scenes/DexScene.js";

const SCENES = {
  main: MainTitleScene,
  briefing: BriefingScene,
  missionMap: MissionMapScene,
  route: RouteRestoreScene,
  geology: GeologyAnalysisScene,
  history: HistoricalArchiveScene,
  ecology: EcologyProtectionScene,
  briefingBoard: BriefingBoardBuildScene,
  presentation: PresentationPrepScene,
  completion: CompletionGalleryScene,
  dex: DexScene,
};

const stage = document.getElementById("stage");
const viewport = document.getElementById("viewport");

let currentKey = null;
let currentRoot = null;
let transitioning = false;
let firstNav = true;

const ctx = {
  stage,
  save,
  navigate(key) { go(key); },
};

function go(key, { push = true } = {}) {
  if (!SCENES[key]) key = "main";
  if (transitioning || key === currentKey) return;
  transitioning = true;

  // 부팅 로더·잔여 모달/토스트 정리
  stage.querySelectorAll("#boot-loader, .modal-mask, .toast").forEach((n) => n.remove());

  const old = currentRoot;
  if (old) {
    (old.__disposers || []).forEach((fn) => { try { fn(); } catch { /* 무시 */ } });
    old.classList.add("scene--out");
  }

  const cfg = PAGES[key];
  let root;
  try {
    root = SCENES[key](ctx);
  } catch (e) {
    console.error("[scene] 렌더 실패:", key, e);
    root = document.createElement("div");
    root.className = "scene";
    root.innerHTML = `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;color:#fff;background:#14365c;font-weight:800">
      <div style="font-size:40px">🌊</div><div>화면을 여는 데 문제가 생겼어요.</div>
      <button style="font:inherit;padding:10px 24px;border-radius:12px;border:0;cursor:pointer" onclick="location.hash='#main';location.reload()">처음 화면으로</button></div>`;
  }
  root.classList.add("scene--in");
  stage.appendChild(root);

  currentKey = key;
  currentRoot = root;
  save.set("currentPage", key);
  if (cfg && cfg.bgm) AudioManager.playBgm(cfg.bgm);
  if (push && location.hash !== "#" + key) {
    if (firstNav) history.replaceState(null, "", "#" + key);   // 첫 진입은 히스토리 안 쌓음
    else location.hash = "#" + key;                            // 이후엔 쌓아서 뒤로가기 지원 (B13)
  }
  firstNav = false;

  setTimeout(() => {
    if (old) old.remove();
    root.classList.remove("scene--in");
    transitioning = false;
    // 전환 중 뒤로가기 등으로 해시가 달라졌으면 따라간다
    const want = location.hash.replace("#", "");
    if (want && want !== currentKey && SCENES[want]) go(want, { push: false });
  }, 360);
}

/* ---- fitStage: 1280×720 스테이지를 화면에 비율 맞춤 ---- */
function fitStage() {
  let vw = window.visualViewport ? window.visualViewport.width : window.innerWidth;
  let vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  if (!vw || !vh) { vw = window.innerWidth; vh = window.innerHeight; }
  if (!vw || !vh) return;
  const scale = Math.max(0.1, Math.min(vw / 1280, vh / 720));
  stage.style.transform = `scale(${scale})`;
  viewport.scrollTop = 0;
  viewport.scrollLeft = 0;
}
function fitStageRetry() {
  fitStage();
  requestAnimationFrame(fitStage);
  setTimeout(fitStage, 120);   // 백그라운드 탭 rAF 정지 대응
  setTimeout(fitStage, 500);
}
window.addEventListener("resize", fitStageRetry);
if (window.visualViewport) window.visualViewport.addEventListener("resize", fitStageRetry);
window.addEventListener("orientationchange", fitStageRetry);

/* ---- 해시 딥링크 ---- */
window.addEventListener("hashchange", () => {
  const key = location.hash.replace("#", "");
  if (key && key !== currentKey) go(key, { push: false });
});

/* ---- 첫 사용자 제스처에서 오디오 잠금 해제 ---- */
window.addEventListener("pointerdown", () => AudioManager.unlock(), { once: true });

/* ---- 시작 ---- */
fitStageRetry();
const initial = location.hash.replace("#", "");
go(SCENES[initial] ? initial : "main", { push: true });
