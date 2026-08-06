/* =========================================================================
   DokdoGlbDiorama.js - 메시(Meshy)로 제작한 실사풍 독도 디오라마 GLB 뷰어
   (외교부 실사 기반 생성 이미지 → image-to-3D, 2026-08)
   - 자동 회전 + 터치 드래그 회전 (줌 소폭 허용, 팬 금지)
   - GLB 로딩 실패 시 onError 콜백 → 호출 씬이 이미지 폴백 표시
   ========================================================================= */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { createThreeStage, registerDisposer } from "./ThreeStage.js";

export function createDokdoGlbDiorama({ root = null, width = 308, height = 260, src = "public/models/dokdo_diorama.glb", onError = null, minDistance = 4.5, maxDistance = 11 } = {}) {
  const stage = createThreeStage({ root, width, height, fov: 38, near: 0.1, far: 100, alpha: true });
  const { renderer, scene, camera } = stage;

  scene.add(new THREE.AmbientLight(0xffffff, 1.1));
  const sun = new THREE.DirectionalLight(0xfff2dc, 1.6);
  sun.position.set(4, 8, 5);
  scene.add(sun);

  camera.position.set(0, 3.4, 7.4);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = minDistance;
  controls.maxDistance = maxDistance;
  controls.minPolarAngle = 0.5;
  controls.maxPolarAngle = 1.35;
  controls.target.set(0, 0.4, 0);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 1.1;
  controls.addEventListener("start", () => { controls.autoRotate = false; });
  controls.update();
  if (root) registerDisposer(root, () => controls.dispose());

  const loader = new GLTFLoader();
  loader.load(
    src,
    (gltf) => {
      const model = gltf.scene;
      // 모델을 지름 ~6 크기로 정규화 후 중앙 배치
      const box = new THREE.Box3().setFromObject(model);
      const size = box.getSize(new THREE.Vector3());
      const scale = 6 / Math.max(size.x, size.z);
      model.scale.setScalar(scale);
      const center = box.getCenter(new THREE.Vector3()).multiplyScalar(scale);
      model.position.sub(center);
      model.position.y += size.y * scale * 0.18; // 받침대가 살짝 위로 오게
      scene.add(model);
    },
    undefined,
    (err) => {
      console.warn("[glb] 디오라마 로딩 실패(폴백):", err);
      if (onError) onError(err);
    },
  );

  stage.setTick(() => controls.update());
  stage.start();

  return { el: stage.el, stage };
}
