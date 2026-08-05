/* =========================================================================
   ThreeStage.js - three.js 공통 래퍼 (2026-07 3D 인프라)
   씬 안에 WebGL 캔버스를 넣을 때 반드시 이 래퍼를 사용한다.
   - 렌더 루프/해제(dispose)를 라우터 씬 교체와 연동 (registerDisposer)
   - 태블릿 발열 방지: 픽셀비 상한 + 탭 숨김 시 렌더 정지
   - #stage 가 CSS transform 스케일되므로 레이캐스트는 반드시
     raycastFromEvent 를 사용한다 (getBoundingClientRect 기준 보정).
   구형 전자칠판 대비: supportsWebGL() 이 false 면 3D를 만들지 말고
   기존 2D 화면을 그대로 유지한다.
   ========================================================================= */
import * as THREE from "three";

/** WebGL 사용 가능 여부 (실패 시 2D 폴백 유지) */
export function supportsWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(window.WebGLRenderingContext && (c.getContext("webgl2") || c.getContext("webgl")));
  } catch (e) {
    return false;
  }
}

/** 씬 루트에 해제 콜백 등록 — app.js 라우터가 씬 제거 직전에 호출 */
export function registerDisposer(sceneRoot, fn) {
  if (!sceneRoot.__disposers) sceneRoot.__disposers = [];
  sceneRoot.__disposers.push(fn);
}

/**
 * 3D 스테이지 생성.
 * @param {object} opts
 *  - root: buildScene()의 root (전달 시 dispose 자동 등록)
 *  - width/height: 1280x720 디자인 좌표 기준 px
 *  - fov/near/far, alpha(투명 배경, 기본 true), maxPixelRatio(기본 1.75)
 * @returns {{ el, renderer, scene, camera, setTick, start, stop, dispose, raycastFromEvent, isRunning }}
 *  - el: 씬 layer에 appendChild 할 컨테이너(캔버스 포함, position:relative)
 *  - setTick(fn): 매 프레임 호출 콜백 (dt초, elapsed초)
 *  - raycastFromEvent(event, objects, recursive=true): 교차 배열 반환
 */
export function createThreeStage({
  root = null, width = 560, height = 300,
  fov = 45, near = 0.1, far = 400,
  alpha = true, maxPixelRatio = 1.75,
} = {}) {
  const el = document.createElement("div");
  Object.assign(el.style, {
    position: "relative", width: width + "px", height: height + "px",
    overflow: "hidden", touchAction: "none",
  });

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPixelRatio));
  renderer.setSize(width, height);
  Object.assign(renderer.domElement.style, { display: "block", width: "100%", height: "100%" });
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, width / height, near, far);

  const clock = new THREE.Clock();
  let tick = null;
  let rafId = 0;
  let running = false;       // 현재 루프 동작 여부
  let wantRunning = false;   // start() 호출 상태(탭 복귀 시 재개 판단)
  let disposed = false;

  function loop() {
    if (!running) return;
    rafId = requestAnimationFrame(loop);
    const dt = clock.getDelta();
    if (tick) tick(dt, clock.elapsedTime);
    renderer.render(scene, camera);
  }
  function start() {
    if (disposed || running) return;
    wantRunning = true; running = true;
    clock.getDelta(); // 정지 구간 dt 누적 제거
    loop();
  }
  function stop({ keepIntent = false } = {}) {
    if (!keepIntent) wantRunning = false;
    running = false;
    cancelAnimationFrame(rafId);
  }
  const onVisibility = () => {
    if (document.hidden) stop({ keepIntent: true });
    else if (wantRunning) start();
  };
  document.addEventListener("visibilitychange", onVisibility);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  /** #stage CSS 스케일을 반영한 레이캐스트 (클릭/터치 이벤트 기준) */
  function raycastFromEvent(event, objects, recursive = true) {
    const src = (event.changedTouches && event.changedTouches[0]) || event;
    const rect = renderer.domElement.getBoundingClientRect();
    if (!rect.width || !rect.height) return [];
    pointer.x = ((src.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((src.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(objects, recursive);
  }

  function disposeMaterial(m) {
    if (!m) return;
    Object.keys(m).forEach((k) => { if (m[k] && m[k].isTexture) m[k].dispose(); });
    m.dispose();
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    stop();
    document.removeEventListener("visibilitychange", onVisibility);
    scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (Array.isArray(obj.material)) obj.material.forEach(disposeMaterial);
      else disposeMaterial(obj.material);
    });
    scene.clear();
    renderer.dispose();
    if (renderer.forceContextLoss) renderer.forceContextLoss();
    el.remove();
  }

  if (root) registerDisposer(root, dispose);

  return {
    el, renderer, scene, camera,
    setTick(fn) { tick = fn; },
    start, stop, dispose, raycastFromEvent,
    get isRunning() { return running; },
  };
}
