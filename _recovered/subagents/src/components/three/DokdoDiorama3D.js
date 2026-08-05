/* =========================================================================
   DokdoDiorama3D.js - 10페이지 전시용 "독도 작은 섬 디오라마" (2026-07 3D)
   받침대(원기둥) 위에 바다 원판 + 로우폴리 동도·서도를 올린 전시 모형.
   - 느린 자동 회전 + 터치 드래그 회전(OrbitControls, 줌/팬 금지)
   - flat shading + ambient/directional 조명 (태블릿 부담 최소화)
   - supportsWebGL() 확인은 호출 씬 책임이지만 여기서도 한 번 더 방어한다.
   ========================================================================= */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createThreeStage, supportsWebGL, registerDisposer } from "./ThreeStage.js";

/* ---- 위치 기반 결정적 난수 (씨임 정점 균열 방지: 같은 좌표 = 같은 값) ---- */
function hashNoise(x, y, z, salt) {
  const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + salt) * 43758.5453;
  return n - Math.floor(n); // 0..1
}

/* ---- 로우폴리 바위섬 지오메트리 (원뿔 정점을 불규칙하게 흔든다) ---- */
function rockGeometry(radius, height, salt) {
  const geo = new THREE.ConeGeometry(radius, height, 7, 3);
  const attr = geo.attributes.position;
  const v = new THREE.Vector3();
  const bottom = -height / 2;
  for (let i = 0; i < attr.count; i++) {
    v.fromBufferAttribute(attr, i);
    if (v.y > bottom + 0.01) { // 밑면은 그대로 두어 바다에 밀착
      const k = 0.78 + hashNoise(v.x, v.y, v.z, salt) * 0.5;
      v.x *= k;
      v.z *= k;
      v.y += (hashNoise(v.z, v.x, v.y, salt + 7) - 0.5) * height * 0.14;
    }
    attr.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

function flatMat(color) {
  return new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95, metalness: 0 });
}

/**
 * 독도 디오라마 3D 생성.
 * @param {object} opts
 *  - root: buildScene()의 root (dispose 자동 등록)
 *  - width/height: 캔버스 크기(px, 1280x720 디자인 좌표 기준)
 * @returns {{ el, stage, dispose } | null} WebGL 미지원이면 null (씬에서 2D 유지)
 */
export function createDokdoDiorama3D({ root = null, width = 300, height = 300 } = {}) {
  if (!supportsWebGL()) return null;

  const stage = createThreeStage({ root, width, height, fov: 38, near: 0.1, far: 60 });
  const { scene, camera, renderer } = stage;

  /* ---- 카메라: 살짝 위에서 내려다보는 전시 시점 ---- */
  camera.position.set(0, 3.4, 7.2);

  /* ---- 조명: ambient + directional (+ 은은한 뒷빛) ---- */
  scene.add(new THREE.AmbientLight(0xdfeaf5, 0.9));
  const sun = new THREE.DirectionalLight(0xfff3d9, 1.4);
  sun.position.set(4, 6, 3);
  scene.add(sun);
  const back = new THREE.DirectionalLight(0x9db9d8, 0.4);
  back.position.set(-3, 2, -4);
  scene.add(back);

  /* ---- 전시 모형 그룹 ---- */
  const model = new THREE.Group();
  scene.add(model);

  // 받침대(원기둥) + 금색 테두리 링
  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(2.75, 3.0, 0.6, 28),
    new THREE.MeshStandardMaterial({ color: 0x8a6844, flatShading: true, roughness: 0.85 })
  );
  pedestal.position.y = -0.52;
  model.add(pedestal);

  const trim = new THREE.Mesh(
    new THREE.CylinderGeometry(2.78, 2.78, 0.09, 28),
    new THREE.MeshStandardMaterial({ color: 0xd9a03a, roughness: 0.5, metalness: 0.35 })
  );
  trim.position.y = -0.2;
  model.add(trim);

  // 바다 원판
  const sea = new THREE.Mesh(
    new THREE.CylinderGeometry(2.55, 2.62, 0.28, 28),
    new THREE.MeshStandardMaterial({ color: 0x2e86c9, flatShading: true, roughness: 0.55 })
  );
  sea.position.y = -0.02;
  model.add(sea);
  const seaTop = 0.12;

  // 서도(서쪽·왼쪽): 더 높고 뾰족한 봉우리 둘
  const seodoMain = new THREE.Mesh(rockGeometry(0.85, 1.5, 3), flatMat(0x6f5b46));
  seodoMain.position.set(-0.95, seaTop + 0.72, 0.12);
  model.add(seodoMain);
  const seodoSub = new THREE.Mesh(rockGeometry(0.5, 0.85, 11), flatMat(0x655241));
  seodoSub.position.set(-1.42, seaTop + 0.4, 0.5);
  model.add(seodoSub);

  // 동도(동쪽·오른쪽): 조금 낮고 펑퍼짐한 봉우리
  const dongdoMain = new THREE.Mesh(rockGeometry(0.82, 0.95, 21), flatMat(0x7a6550));
  dongdoMain.position.set(0.98, seaTop + 0.45, -0.08);
  model.add(dongdoMain);
  const dongdoSub = new THREE.Mesh(rockGeometry(0.42, 0.55, 33), flatMat(0x6f5b46));
  dongdoSub.position.set(1.45, seaTop + 0.26, 0.42);
  model.add(dongdoSub);

  // 풀·이끼 느낌의 초록 언덕(납작한 저면 다면체)
  [
    { x: -0.8, z: -0.25, r: 0.3, salt: 41 },
    { x: 1.0, z: 0.35, r: 0.26, salt: 55 },
  ].forEach((g) => {
    const grass = new THREE.Mesh(new THREE.IcosahedronGeometry(g.r, 0), flatMat(0x3f7d46));
    grass.scale.y = 0.45;
    grass.position.set(g.x, seaTop + 0.1 + hashNoise(g.x, 0, g.z, g.salt) * 0.08, g.z);
    model.add(grass);
  });

  // 주변 작은 바위들
  [
    { x: 0.1, z: 0.95, r: 0.17, salt: 61 },
    { x: -0.2, z: -1.15, r: 0.14, salt: 73 },
    { x: 1.85, z: -0.75, r: 0.12, salt: 87 },
  ].forEach((s) => {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(s.r, 0), flatMat(0x5f5142));
    rock.position.set(s.x, seaTop + s.r * 0.4, s.z);
    model.add(rock);
  });

  /* ---- 조작: 회전만 허용 (줌/팬 금지, polar 거의 고정) + 느린 자동 회전 ---- */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.55, 0);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.55;
  controls.minPolarAngle = 1.08; // 시점 위아래는 거의 고정
  controls.maxPolarAngle = 1.28;
  controls.autoRotate = true;    // 전시 모형처럼 천천히 돈다
  controls.autoRotateSpeed = 0.9;
  controls.update();

  stage.setTick(() => { controls.update(); });
  stage.start();

  function dispose() {
    controls.dispose();
    stage.dispose();
  }
  if (root) registerDisposer(root, () => controls.dispose()); // stage 쪽은 자체 등록됨

  return { el: stage.el, stage, dispose };
}

export default createDokdoDiorama3D;
