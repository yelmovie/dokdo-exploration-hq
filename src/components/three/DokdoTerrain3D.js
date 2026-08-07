/* =========================================================================
   DokdoTerrain3D.js - 5페이지 바위섬 분석실 전용 3D 지형 빌더 (2026-07)
   절차적 로우폴리 독도: 동도·서도 두 바위섬 + 부속 바위, 파도 애니메이션,
   관찰 마커(발광 배지 스프라이트) 클릭, 단면 보기(클리핑 지층 노출).
   - 반드시 ThreeStage 래퍼 위에서 동작 (dispose는 라우터 씬 교체와 연동)
   - 클릭 판정은 stage.raycastFromEvent 만 사용 (#stage CSS 스케일 보정)
   - 마커 id는 GeologyAnalysisScene 의 단서 데이터와 1:1 로 맞춘다
   ========================================================================= */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createThreeStage, registerDisposer } from "./ThreeStage.js";

/* 관찰 마커 기본 위치 (씬 단서 id: cliff/flat/erosion/bird 와 1:1) */
export const TERRAIN_MARKERS = [
  { id: "cliff",   pos: [-3.7, 2.35, 1.25] },  // 서도 가파른 절벽
  { id: "flat",    pos: [2.9, 2.85, -0.2] },   // 동도 위쪽 좁은 평지
  { id: "erosion", pos: [-1.5, 0.65, 2.2] },   // 물가 침식 지형
  { id: "bird",    pos: [4.9, 1.4, 1.7] },     // 바닷새 서식 부속 바위
];

/* 실사 GLB 모드용 마커 위치 — y 는 로딩 시 지형 표면을 레이캐스트로 실측해 결정
   (모델 중심 원점, 지름 ~10.5 정규화 기준. 폴백용 y 포함) */
const GLB_MARKERS = {
  cliff:   [-2.5, 4.0, 0.9],   // 서도 봉우리 절벽 (높은 섬 쪽으로 자동 배정)
  flat:    [2.5, 3.0, -0.3],   // 동도 평평한 정상 (낮은 섬 쪽으로 자동 배정)
  erosion: [0.2, 1.5, 2.2],    // 물가 침식 바위(아치 부근)
  bird:    [4.2, 1.6, 1.3],    // 부속 바위
};

/* 내부 지층(단면) 색 — 삼형제굴 실사(외교부) 기준: 현무암/붉은 화산암/응회암/겉층 */
const STRATA_COLORS = [0x3f3d3a, 0x7a4a33, 0x6e675e, 0x87764a].map((c) => new THREE.Color(c));

/* 위치 기반 결정적 지터 — 같은 좌표의 중복 정점은 같은 오프셋을 받아
   원기둥 이음새(seam)가 갈라지지 않는다 */
function hash01(x, y, z, seed) {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 53.13) * 43758.5453;
  return s - Math.floor(s);
}

/* 로우폴리 바위 지오메트리: 원기둥 정점 지터 → 비인덱스 변환(플랫 셰이딩) */
function makeRockGeometry({ topR, bottomR, height, radial = 9, rings = 5, seed = 1, jitter = 0.34 }) {
  let geo = new THREE.CylinderGeometry(topR, bottomR, height, radial, rings);
  const p = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const t = (v.y + height / 2) / height; // 0(바닥) ~ 1(꼭대기)
    const jx = (hash01(v.x, v.y, v.z, seed) - 0.5) * jitter * (0.5 + t);
    const jz = (hash01(v.z, v.x, v.y, seed + 7) - 0.5) * jitter * (0.5 + t);
    const jy = t > 0.02 ? (hash01(v.y, v.z, v.x, seed + 13) - 0.5) * jitter * 0.9 : 0; // 바닥 링은 수면 아래 유지
    p.setXYZ(i, v.x + jx, v.y + jy, v.z + jz);
  }
  geo = geo.toNonIndexed();
  geo.computeVertexNormals();
  return geo;
}

/* 겉면 정점 색: 아래 바위 갈색 → 위로 갈수록 살짝 녹색 */
function paintRockColors(geo, height) {
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  /* 실사 기준 팔레트(외교부 사진): 어두운 암회갈 바위 + 위쪽 비탈의 식생 초록 */
  const cBottom = new THREE.Color(0x544d43);
  const cMid = new THREE.Color(0x6e6659);
  const cTop = new THREE.Color(0x5e7c46);
  const c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const t = Math.min(1, Math.max(0, (p.getY(i) + height / 2) / height));
    if (t < 0.6) c.copy(cBottom).lerp(cMid, t / 0.6);
    else c.copy(cMid).lerp(cTop, (t - 0.6) / 0.4);
    const n = (hash01(p.getX(i), p.getY(i), p.getZ(i), 99) - 0.5) * 0.08;
    colors[i * 3] = c.r + n;
    colors[i * 3 + 1] = c.g + n;
    colors[i * 3 + 2] = c.b + n;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/* 내부 지층 색: 면(삼각형) 단위로 높이 밴드를 칠해 또렷한 층 표현 */
function paintStrataColors(geo, height) {
  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  for (let f = 0; f < p.count; f += 3) {
    const yAvg = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3;
    const t = Math.min(0.999, Math.max(0, (yAvg + height / 2) / height));
    const c = STRATA_COLORS[Math.floor(t * STRATA_COLORS.length)];
    for (let k = 0; k < 3; k++) {
      colors[(f + k) * 3] = c.r;
      colors[(f + k) * 3 + 1] = c.g;
      colors[(f + k) * 3 + 2] = c.b;
    }
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

/* 마커 배지 캔버스 텍스처 (발광 링 + 원 + 기호) */
function badgeTexture(text, bg, ring) {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 128;
  const g = cv.getContext("2d");
  g.beginPath(); g.arc(64, 64, 62, 0, Math.PI * 2); g.fillStyle = ring; g.fill();
  g.beginPath(); g.arc(64, 64, 46, 0, Math.PI * 2); g.fillStyle = bg; g.fill();
  g.lineWidth = 6; g.strokeStyle = "#ffffff"; g.stroke();
  g.font = "bold 52px 'Segoe UI Emoji','Apple Color Emoji',sans-serif";
  g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#ffffff";
  g.fillText(text, 64, 66);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * 독도 3D 지형 뷰어 생성.
 * @param {object} opts
 *  - root: buildScene()의 root (dispose 자동 연동, 필수 권장)
 *  - width/height: 디자인 좌표 px (기본 560x300)
 *  - onMarkerSelect(id): 마커 클릭 콜백
 * @returns {{ el, stage, setMarkerCollected, setSectionView, sectionOn }}
 */
export function createDokdoTerrain3D({ root = null, width = 560, height = 300, onMarkerSelect = null, onSectionMarkerSelect = null, glbSrc = null } = {}) {
  const stage = createThreeStage({ root, width, height, fov: 42, near: 0.1, far: 300, alpha: true });
  const { renderer, scene, camera } = stage;
  renderer.localClippingEnabled = true; // 단면 보기(클리핑)용

  /* ---- 조명: ambient + directional 1개 (그림자 없음, 태블릿 성능 고려) ---- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.85));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.25);
  sun.position.set(6, 10, 4);
  scene.add(sun);

  /* ---- 바다: 평면 정점 y 사인파로 은은한 파도 ---- */
  const seaGeo = new THREE.PlaneGeometry(90, 90, 26, 26);
  seaGeo.rotateX(-Math.PI / 2);
  const seaMat = new THREE.MeshLambertMaterial({ color: 0x2478ad, flatShading: true }); // 실사의 깊은 동해색
  const seaMesh = new THREE.Mesh(seaGeo, seaMat);
  scene.add(seaMesh);
  const seaPos = seaGeo.attributes.position;
  const seaBase = seaPos.array.slice(); // 원래 x/z 보존

  /* ---- 섬: 겉면(shell) + 내부 지층(core, 단면 전용) ---- */
  const shellMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const coreMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
  const islands = new THREE.Group();
  const cores = new THREE.Group();
  cores.visible = false;
  scene.add(islands);
  scene.add(cores);

  function addIsland({ x, z, topR, bottomR, height: h, seed }) {
    const shellGeo = makeRockGeometry({ topR, bottomR, height: h, seed });
    paintRockColors(shellGeo, h);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.position.set(x, h / 2 - 0.55, z); // 밑동은 수면 아래로
    islands.add(shell);

    const coreGeo = shellGeo.clone();
    coreGeo.scale(0.94, 0.985, 0.94);
    paintStrataColors(coreGeo, h);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.copy(shell.position);
    cores.add(core);
  }
  /* 실사(외교부 사진) 실루엣 기준: 서도=뾰족한 쌍봉 피라미드(168.5m),
     동도=낮고 위가 평평(98.6m), 사이에 촛대바위형 기둥과 부속 바위들 */
  addIsland({ x: -2.9, z: 0.5,  topR: 0.45, bottomR: 2.7, height: 4.6, seed: 3 });   // 서도 주봉
  addIsland({ x: -1.6, z: -0.7, topR: 0.3,  bottomR: 1.5, height: 3.3, seed: 41 });  // 서도 둘째 봉(쌍봉 실루엣)
  addIsland({ x: 2.9,  z: -0.4, topR: 1.35, bottomR: 2.5, height: 2.8, seed: 11 });  // 동도(넓고 평평한 정상)
  addIsland({ x: 0.6,  z: 1.9,  topR: 0.14, bottomR: 0.42, height: 2.3, seed: 45 }); // 촛대바위(가는 기둥)
  addIsland({ x: 0.3,  z: 2.8,  topR: 0.2,  bottomR: 0.7, height: 1.2, seed: 21 });  // 부속 바위
  addIsland({ x: 4.9,  z: 1.7,  topR: 0.18, bottomR: 0.6, height: 1.5, seed: 27 });  // 바닷새 바위
  addIsland({ x: -5.0, z: -1.6, topR: 0.22, bottomR: 0.8, height: 1.1, seed: 33 });  // 부속 바위

  /* ---- 관찰 마커: 발광 배지 스프라이트 + 펄스 스케일 ---- */
  const seekTex = badgeTexture("🔍", "#f0a72e", "rgba(255,220,120,.55)");
  const doneTex = badgeTexture("✓", "#2f9e44", "rgba(140,230,160,.5)");
  // depthTest 끔: 지형 뒤·경사면에 있어도 단서 아이콘이 항상 보이게
  const seekMat = new THREE.SpriteMaterial({ map: seekTex, transparent: true, depthTest: false });
  const doneMat = new THREE.SpriteMaterial({ map: doneTex, transparent: true, depthTest: false });
  const sprites = [];
  const setSpritePos = (sp, p) => { sp.position.set(p[0], p[1], p[2]); sp.userData.baseY = p[1]; };
  TERRAIN_MARKERS.forEach((m, i) => {
    const sp = new THREE.Sprite(seekMat);
    sp.userData = { markerId: m.id, phase: i * 1.4, collected: false, baseY: m.pos[1] };
    setSpritePos(sp, m.pos);
    sp.scale.set(1.05, 1.05, 1);
    sp.renderOrder = 10;
    sprites.push(sp);
    scene.add(sp);
  });
  // 공유 재질/텍스처는 traverse 해제에서 빠질 수 있어 별도 등록
  if (root) registerDisposer(root, () => { seekMat.dispose(); doneMat.dispose(); seekTex.dispose(); doneTex.dispose(); });

  /* ---- 단면 모드 전용 번호 배지 ①~④ (특징 위치 — 탭하면 씬이 설명을 보여 준다) ---- */
  const SECTION_MARKERS = [
    { n: 1, pos: [-2.9, 4.4, 0.9] },   // 가파른 바위 절벽 (서도 상부)
    { n: 2, pos: [2.9, 3.2, -0.3] },   // 좁은 평지 (동도 정상)
    { n: 3, pos: [0.6, 1.9, 0.6] },    // 화산 조각이 굳은 암석층 (단면 노출부)
    { n: 4, pos: [-1.4, 0.55, 2.5] },  // 파도에 깎인 해안 바위 (물가)
  ];
  const secSprites = SECTION_MARKERS.map((m, i) => {
    const tex = badgeTexture(String(m.n), "#14568f", "rgba(130,190,245,.6)");
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    const sp = new THREE.Sprite(mat);
    sp.position.set(m.pos[0], m.pos[1], m.pos[2]);
    sp.scale.set(0.95, 0.95, 1);
    sp.renderOrder = 11;
    sp.userData = { sectionN: m.n, phase: i * 1.1, baseY: m.pos[1] };
    sp.visible = false;
    scene.add(sp);
    if (root) registerDisposer(root, () => { mat.dispose(); tex.dispose(); });
    return sp;
  });

  /* ---- 카메라 + OrbitControls (회전/줌만, 지평선 아래 금지) ---- */
  camera.position.set(2.5, 5.2, 12.8);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.minDistance = 7.5;
  controls.maxDistance = 21;
  controls.minPolarAngle = 0.35;
  controls.maxPolarAngle = 1.45; // 바다 아래로 내려가지 않게
  controls.target.set(0, 1.2, 0);
  controls.autoRotate = true;    // 첫 조작 전 천천히 자동 회전
  controls.autoRotateSpeed = 0.9;
  controls.addEventListener("start", () => { controls.autoRotate = false; });
  controls.update();
  if (root) registerDisposer(root, () => controls.dispose());

  /* ---- 실사 GLB (겉모습 모드): 성공 시 절차 모델·바다를 GLB 디오라마로 대체.
     단면 보기는 언제나 절차 지층 모형으로 전환한다 (교육 기능 유지). ---- */
  let glbModel = null;
  let glbPos = { ...GLB_MARKERS }; // 로딩 후 표면 실측값으로 갱신
  if (glbSrc) {
    new GLTFLoader().load(glbSrc, (gltf) => {
      glbModel = gltf.scene;
      const box = new THREE.Box3().setFromObject(glbModel);
      const size = box.getSize(new THREE.Vector3());
      const scale = 10.5 / Math.max(size.x, size.z);
      glbModel.scale.setScalar(scale);
      const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
      glbModel.position.sub(center);
      glbModel.position.y += 1.15; // 원판이 화면 중앙에 오도록 (카메라 타깃 y=1.2 기준)
      scene.add(glbModel);
      if (!sectionOn) { islands.visible = false; seaMesh.visible = false; }
      // 지형 표면 높이를 레이캐스트로 실측 → 마커를 표면 위에 띄운다 (섬 속에 묻힘 방지)
      const ray = new THREE.Raycaster();
      const surfaceY = (x, z) => {
        ray.set(new THREE.Vector3(x, 30, z), new THREE.Vector3(0, -1, 0));
        const hit = ray.intersectObject(glbModel, true);
        return hit.length ? hit[0].point.y : 1.2;
      };
      // 절벽 단서 = 더 높은 봉우리(서도), 평지 단서 = 낮은 섬(동도) — 실제 지형 기준 자동 배정
      const hL = surfaceY(-2.5, 0.6), hR = surfaceY(2.5, -0.3);
      const west = hL >= hR ? [-2.5, 0.6] : [2.5, -0.3];
      const east = hL >= hR ? [2.5, -0.3] : [-2.5, 0.6];
      glbPos = {
        cliff:   [west[0], surfaceY(west[0], west[1]) + 0.65, west[1]],
        flat:    [east[0], surfaceY(east[0], east[1]) + 0.65, east[1]],
        erosion: [0.2, surfaceY(0.2, 2.2) + 0.6, 2.2],
        bird:    [4.2, surfaceY(4.2, 1.3) + 0.6, 1.3],
      };
      if (!sectionOn) sprites.forEach((sp) => setSpritePos(sp, glbPos[sp.userData.markerId]));
    }, undefined, (err) => console.warn("[glb] 지형 모델 로딩 실패 — 절차 모델 유지:", err));
  }

  /* ---- 단면 보기: 클리핑 평면으로 앞쪽 절반을 잘라 지층 노출 ---- */
  const clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.15); // z > 0.15 잘림
  let sectionOn = false;
  let camGoal = null; // 단면 진입 시 절단면 정면으로 카메라 이동 (tick 에서 lerp)
  function setSectionView(on) {
    sectionOn = !!on;
    const planes = sectionOn ? [clipPlane] : null;
    shellMat.clippingPlanes = planes;
    coreMat.clippingPlanes = planes;
    cores.visible = sectionOn;
    // 단면 = 번호 배지 관찰 모드 / 겉모습 = 단서 수집 모드
    secSprites.forEach((s) => { s.visible = sectionOn; });
    sprites.forEach((s) => { s.visible = !sectionOn; });
    if (sectionOn) {
      controls.autoRotate = false;
      camGoal = { pos: new THREE.Vector3(0, 3.6, 12.4), tgt: new THREE.Vector3(0, 1.3, 0) };
    } else {
      camGoal = null;
    }
    if (glbModel) {
      // 겉모습 = 실사 GLB / 단면 = 절차 지층 모형
      glbModel.visible = !sectionOn;
      islands.visible = sectionOn;
      seaMesh.visible = sectionOn;
      sprites.forEach((sp) => {
        const src = sectionOn ? TERRAIN_MARKERS.find((m) => m.id === sp.userData.markerId).pos : glbPos[sp.userData.markerId];
        if (src) setSpritePos(sp, src);
      });
    }
  }

  /* ---- 마커 수집 표시: 배지를 초록 체크로 교체 ---- */
  function setMarkerCollected(id) {
    const sp = sprites.find((s) => s.userData.markerId === id);
    if (!sp || sp.userData.collected) return;
    sp.userData.collected = true;
    sp.material = doneMat;
    sp.scale.set(0.85, 0.85, 1);
  }

  /* ---- 클릭 판정: 드래그(회전)와 구분해 탭만 마커 선택으로 처리 ---- */
  let downX = 0, downY = 0;
  renderer.domElement.addEventListener("pointerdown", (e) => { downX = e.clientX; downY = e.clientY; });
  renderer.domElement.addEventListener("pointerup", (e) => {
    if (Math.hypot(e.clientX - downX, e.clientY - downY) > 7) return;
    if (sectionOn) {
      const hits = stage.raycastFromEvent(e, secSprites, false);
      if (hits.length && onSectionMarkerSelect) onSectionMarkerSelect(hits[0].object.userData.sectionN);
      return;
    }
    const hits = stage.raycastFromEvent(e, sprites, false);
    if (hits.length && onMarkerSelect) onMarkerSelect(hits[0].object.userData.markerId);
  });

  /* ---- 프레임 루프: 컨트롤 감쇠 + 파도 + 마커 펄스 ---- */
  stage.setTick((dt, t) => {
    if (camGoal) {
      const k = Math.min(1, dt * 3.2);
      camera.position.lerp(camGoal.pos, k);
      controls.target.lerp(camGoal.tgt, k);
      if (camera.position.distanceTo(camGoal.pos) < 0.06) camGoal = null;
    }
    controls.update();
    for (let i = 0; i < seaPos.count; i++) {
      const x = seaBase[i * 3], z = seaBase[i * 3 + 2];
      seaPos.setY(i, Math.sin(x * 0.5 + t * 1.2) * 0.09 + Math.cos(z * 0.45 + t * 0.9) * 0.07);
    }
    seaPos.needsUpdate = true;
    for (const sp of sprites) {
      if (sp.userData.collected) { sp.position.y = sp.userData.baseY; continue; }
      const s = 1.05 + Math.sin(t * 3 + sp.userData.phase) * 0.13;
      sp.scale.set(s, s, 1);
      // 위아래 둥실 — 움직임으로 단서 위치가 한눈에 보이게
      sp.position.y = sp.userData.baseY + Math.sin(t * 2.2 + sp.userData.phase) * 0.14;
    }
    for (const sp of secSprites) {
      if (!sp.visible) continue;
      sp.position.y = sp.userData.baseY + Math.sin(t * 2 + sp.userData.phase) * 0.1;
    }
  });
  stage.start();

  return {
    el: stage.el, stage,
    setMarkerCollected, setSectionView,
    get sectionOn() { return sectionOn; },
  };
}
