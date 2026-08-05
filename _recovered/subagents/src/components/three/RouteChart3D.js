/* =========================================================================
   RouteChart3D.js - 3D 해도 항로 복원 활동 (2026-07 three.js)
   낮게 기울어진 준-탑뷰(항해 지도 시점) 위에서 부표(부이)를 올바른 순서로
   탭해 울릉도 → 독도 항로를 잇는다. OrbitControls는 사용하지 않는다
   (학생 혼란 방지 — 카메라 고정). 순서 채점은 grading.checkOrder 재사용.
   - 렌더 루프/해제는 ThreeStage가 관리 (root 전달 시 dispose 자동)
   - 클릭 판정은 raycastFromEvent (#stage CSS 스케일 보정 내장)
   - 라벨/나침반/방위/거리표는 DOM 오버레이 (Vector3.project 화면 투영)
   - 오답: 부표 흔들림 + wrong 사운드 (힌트 토스트는 씬이 onWrong으로 처리)
   - 완주: 배가 항로를 따라 항해(약 2.6초) + 거리 라벨 + correct 사운드
   ========================================================================= */
import * as THREE from "three";
import { el } from "../../core/dom.js";
import { createThreeStage } from "./ThreeStage.js";
import { checkOrder } from "../../core/grading.js";
import AudioManager from "../../managers/AudioManager.js";

/* 노드 id → 해도 내부 3D 좌표 (서쪽 울릉도 → 동쪽 독도로 지그재그 항로) */
const NODE_POS = {
  n1: { x: -14.5, z: 3.2 },
  n2: { x: -5.2, z: -2.6 },
  n3: { x: 5.2, z: 2.6 },
  n4: { x: 14.6, z: -0.9 },
};
const SEA_W = 92, SEA_D = 30;   // 바다 평면 크기 (카메라 화각을 가득 덮는다)
const ROUTE_Y = 0.6;            // 항로선/배 높이 (파도 위)
const SAIL_SEC = 2.6;           // 완주 항해 연출 시간
const SHAKE_SEC = 0.55;         // 오답 부표 흔들림 시간
const CIRC = ["①", "②", "③", "④", "⑤", "⑥"];

/**
 * 3D 해도 항로 복원 활동 생성.
 * @param {object} opts
 *  - root: buildScene()의 root (dispose 자동 등록)
 *  - nodes: ROUTE_PATH.nodes ([{id,label,hint}])
 *  - answer: ROUTE_PATH.answer ([id...])
 *  - width/height: 캔버스 크기 (1280x720 디자인 좌표 기준)
 *  - onWrong(expectedIdx, tappedId): 오답 탭 시 (씬이 힌트 토스트 표시)
 *  - onComplete(): 4개 노드 완주 시 (배 항해 연출과 동시에 호출)
 * @returns {{ el, isComplete }}
 */
export function createRouteChart3D({
  root, nodes, answer, width = 680, height = 256,
  onWrong = null, onComplete = null,
} = {}) {
  const stage = createThreeStage({ root, width, height, fov: 36, near: 0.1, far: 250 });
  const { scene, camera } = stage;

  /* ---- 컨테이너: 하늘→바다 그라데이션 배경 + 라운드 프레임 ---- */
  Object.assign(stage.el.style, {
    borderRadius: "16px", border: "2px solid rgba(20,60,100,.35)",
    background: "linear-gradient(180deg,#cfe9fa 0%,#9fd0ee 26%,#2f7fbe 60%,#1d5c94 100%)",
    flex: "0 0 auto", cursor: "pointer",
  });

  /* ---- 카메라: 낮게 기울어진 준-탑뷰 (회전 고정) ---- */
  camera.position.set(0, 25, 26);
  camera.lookAt(0, 0.5, -2.5);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
  camera.matrixWorldInverse.copy(camera.matrixWorld).invert(); // DOM 라벨 투영용 선계산

  /* ---- 조명 ---- */
  scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x1d4d7e, 1.0));
  const sun = new THREE.DirectionalLight(0xfff6e0, 1.15);
  sun.position.set(-20, 30, 16);
  scene.add(sun);

  /* ---- 로우폴리 바다 (사인파 파도 애니메이션) ---- */
  const seaGeo = new THREE.PlaneGeometry(SEA_W, SEA_D, 46, 20);
  const seaMat = new THREE.MeshPhongMaterial({ color: 0x2f86c9, flatShading: true, shininess: 70, specular: 0x9fd0f0 });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.rotation.x = -Math.PI / 2;
  scene.add(sea);
  const waveBase = Float32Array.from(seaGeo.attributes.position.array); // 원본 좌표 (z만 흔든다)

  /* ---- 로우폴리 섬: 서쪽 울릉도(크게) / 동쪽 독도(서도·동도 두 봉우리) ---- */
  function peak(r, h, seg, color, x, z, ry = 0) {
    const m = new THREE.Mesh(
      new THREE.ConeGeometry(r, h, seg),
      new THREE.MeshPhongMaterial({ color, flatShading: true })
    );
    m.position.set(x, h / 2 - 0.15, z);
    m.rotation.y = ry;
    return m;
  }
  scene.add(peak(4.8, 3.8, 7, 0x4f9e57, -21.6, -2.2, 0.4)); // 울릉도 본체
  scene.add(peak(2.6, 1.6, 6, 0x67b06b, -18.6, 0.6, 1.1));  // 울릉도 앞자락
  scene.add(peak(1.9, 2.7, 6, 0x7c6a55, 19.9, -0.4, 0.2));  // 서도 (더 높다)
  scene.add(peak(1.5, 2.0, 6, 0x8a7a60, 22.2, -1.5, 0.9));  // 동도

  /* ---- 부표(부이) 마커: 몸통 + 기둥 + 깃발 + 투명 히트 구 ---- */
  const buoys = [];
  const hitMeshes = [];
  nodes.forEach((n, i) => {
    const p = NODE_POS[n.id] || { x: -15 + i * 10, z: 0 };
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshPhongMaterial({ color: 0xf59f00, flatShading: true });
    const flagMat = new THREE.MeshPhongMaterial({ color: 0xe03131, flatShading: true });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.66, 0.6, 8), bodyMat);
    body.position.y = 0.32;
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 1.2, 6),
      new THREE.MeshPhongMaterial({ color: 0x4b5866 })
    );
    pole.position.y = 1.1;
    const flag = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.62, 4), flagMat);
    flag.position.y = 1.85;
    /* 히트 영역: 손가락 탭을 넉넉히 받는 투명 구 (visible=false는 쓰지 않는다) */
    const hit = new THREE.Mesh(
      new THREE.SphereGeometry(2.0, 8, 8),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    hit.position.y = 1.0;
    hit.userData.nodeId = n.id;
    g.add(body, pole, flag, hit);
    g.position.set(p.x, 0, p.z);
    scene.add(g);
    hitMeshes.push(hit);
    buoys.push({ id: n.id, label: n.label, group: g, baseX: p.x, bodyMat, flagMat, shake: 0, phase: i * 1.7 });
  });
  const buoyById = Object.fromEntries(buoys.map((b) => [b.id, b]));
  function nodeVec(id) {
    const b = buoyById[id];
    return new THREE.Vector3(b.baseX, ROUTE_Y, b.group.position.z);
  }

  /* ---- 항로선: 짧은 세그먼트로 점선 느낌 ---- */
  const routeGroup = new THREE.Group();
  scene.add(routeGroup);
  const dashGeo = new THREE.BoxGeometry(1, 0.1, 0.22);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xe03131 });
  const X_AXIS = new THREE.Vector3(1, 0, 0);
  function addDashes(fromId, toId) {
    const a = nodeVec(fromId), b = nodeVec(toId);
    const dir = b.clone().sub(a);
    const dist = dir.length();
    dir.normalize();
    const quat = new THREE.Quaternion().setFromUnitVectors(X_AXIS, dir);
    const dashLen = 0.85, gap = 0.5;
    for (let d = 1.0; d + dashLen <= dist - 1.0; d += dashLen + gap) {
      const m = new THREE.Mesh(dashGeo, dashMat);
      m.scale.x = dashLen;
      m.position.copy(a).addScaledVector(dir, d + dashLen / 2);
      m.quaternion.copy(quat);
      routeGroup.add(m);
    }
  }

  /* ---- 배(완주 연출): 선체 + 선실 + 돛 (+Z가 뱃머리) ---- */
  const ship = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.42, 2.0),
    new THREE.MeshPhongMaterial({ color: 0x8d5b2f, flatShading: true })
  );
  hull.position.y = 0.2;
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.3, 0.6),
    new THREE.MeshPhongMaterial({ color: 0xb98a4f, flatShading: true })
  );
  cabin.position.set(0, 0.5, -0.4);
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.05, 0.05, 1.5, 6),
    new THREE.MeshPhongMaterial({ color: 0x5b4632 })
  );
  mast.position.y = 1.1;
  const sail = new THREE.Mesh(
    new THREE.ConeGeometry(0.6, 1.3, 4),
    new THREE.MeshPhongMaterial({ color: 0xf8f9fa, flatShading: true })
  );
  sail.position.y = 1.25;
  sail.rotation.y = Math.PI / 4;
  ship.add(hull, cabin, mast, sail);
  ship.visible = false;
  scene.add(ship);

  /* ---- DOM 오버레이: 3D 좌표 → 화면 좌표 투영 ---- */
  const proj = new THREE.Vector3();
  function toScreen(x, y, z) {
    proj.set(x, y, z).project(camera);
    return { x: (proj.x + 1) / 2 * width, y: (1 - proj.y) / 2 * height };
  }
  const labelStyleBase = {
    position: "absolute", transform: "translate(-50%,-100%)", zIndex: "3",
    pointerEvents: "none", whiteSpace: "nowrap",
    background: "rgba(255,253,247,.94)", border: "1.5px solid rgba(20,60,100,.4)",
    borderRadius: "999px", padding: "2px 9px",
    fontSize: "12px", fontWeight: "800", color: "var(--navy)",
    boxShadow: "0 2px 5px rgba(0,0,0,.25)",
  };
  /* 부표 라벨 (카메라 고정이라 위치는 1회 계산) */
  buoys.forEach((b) => {
    const s = toScreen(b.baseX, 2.7, b.group.position.z);
    b.labelEl = el("div", { style: { ...labelStyleBase, left: s.x + "px", top: s.y + "px" }, text: b.label });
    stage.el.appendChild(b.labelEl);
  });
  /* 섬 이름표 */
  [["울릉도", -20.8, 4.6, -2.2], ["독도 (서도·동도)", 21.0, 3.6, -1.0]].forEach(([t, x, y, z]) => {
    const s = toScreen(x, y, z);
    stage.el.appendChild(el("div", {
      style: { ...labelStyleBase, background: "rgba(15,46,77,.78)", color: "#fff", border: "1.5px solid rgba(255,255,255,.55)", left: s.x + "px", top: s.y + "px" },
      text: t,
    }));
  });
  /* 나침반 N + 동서 방위 표시 */
  stage.el.appendChild(el("div", {
    style: { position: "absolute", top: "8px", right: "10px", zIndex: "3", pointerEvents: "none", display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(15,46,77,.6)", borderRadius: "999px", padding: "5px 8px", color: "#fff", fontWeight: "900", lineHeight: "1.05" },
  }, [
    el("div", { text: "▲", style: { fontSize: "10px" } }),
    el("div", { text: "N", style: { fontSize: "14px" } }),
  ]));
  const ewStyle = { position: "absolute", bottom: "6px", zIndex: "3", pointerEvents: "none", color: "rgba(255,255,255,.92)", fontSize: "11px", fontWeight: "800", textShadow: "0 1px 2px rgba(0,0,0,.45)" };
  stage.el.appendChild(el("div", { style: { ...ewStyle, left: "10px" }, text: "◀ 서(W)" }));
  stage.el.appendChild(el("div", { style: { ...ewStyle, right: "10px" }, text: "동(E) ▶" }));
  /* 거리 라벨 (완주 시 표시) */
  const distEl = el("div", {
    style: { position: "absolute", left: "50%", bottom: "8px", transform: "translateX(-50%)", zIndex: "4", display: "none", pointerEvents: "none", background: "rgba(255,253,247,.96)", border: "2px solid #e8b13c", borderRadius: "999px", padding: "5px 14px", fontSize: "14px", fontWeight: "900", color: "var(--navy)", boxShadow: "0 3px 8px rgba(0,0,0,.3)" },
    text: "📏 울릉도 → 독도 약 87.4km",
  });
  stage.el.appendChild(distEl);

  /* ---- 상태/탭 처리: 올바른 다음 노드만 연결 (checkOrder와 일관) ---- */
  const placed = [];
  let done = false;

  function markPlaced(id) {
    const b = buoyById[id];
    b.bodyMat.color.set(0x37b24d);
    b.flagMat.color.set(0x2f9e44);
    b.labelEl.textContent = `${CIRC[placed.length - 1] || ""} ${b.label}`;
    Object.assign(b.labelEl.style, { background: "#e9f8ec", border: "1.5px solid #2f9e44", color: "#1d6b2e" });
  }

  const shipState = { active: false, doneSail: false, t: 0, segs: [], total: 0 };
  function startSail() {
    const pts = answer.map((id) => nodeVec(id));
    shipState.segs = [];
    shipState.total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = pts[i].distanceTo(pts[i + 1]);
      shipState.segs.push({ a: pts[i], b: pts[i + 1], dir: pts[i + 1].clone().sub(pts[i]).normalize(), len });
      shipState.total += len;
    }
    ship.position.copy(pts[0]);
    ship.visible = true;
    shipState.active = true;
    shipState.t = 0;
  }

  function handleTap(id) {
    if (done || placed.includes(id)) return;
    const attempt = placed.concat(id);
    if (checkOrder(attempt, answer.slice(0, attempt.length))) {
      placed.push(id);
      markPlaced(id);
      if (placed.length >= 2) addDashes(placed[placed.length - 2], id);
      AudioManager.unlock();
      if (placed.length === answer.length) {
        done = true;
        AudioManager.correct();
        distEl.style.display = "";
        startSail();
        onComplete && onComplete();
      } else {
        AudioManager.click();
      }
    } else {
      /* 오답: 정답 비공개 — 흔들림 + wrong 사운드, 힌트 토스트는 씬 담당 */
      AudioManager.unlock();
      AudioManager.wrong();
      const b = buoyById[id];
      if (b) b.shake = SHAKE_SEC;
      onWrong && onWrong(placed.length, id);
    }
  }

  function onClick(ev) {
    if (done) return;
    const hits = stage.raycastFromEvent(ev, hitMeshes, false);
    if (hits.length) handleTap(hits[0].object.userData.nodeId);
  }
  stage.el.addEventListener("click", onClick); // stage.el과 함께 제거되므로 전역 리스너 아님

  /* ---- 매 프레임: 파도 / 부표 둥실·흔들림 / 배 항해 ---- */
  const seaPos = seaGeo.attributes.position;
  const shipPos = new THREE.Vector3();
  stage.setTick((dt, t) => {
    /* 파도: 원본 좌표 기준 사인파 (flatShading이라 노멀 재계산 불필요) */
    for (let i = 0, cnt = seaPos.count; i < cnt; i++) {
      const x = waveBase[i * 3], y = waveBase[i * 3 + 1];
      seaPos.setZ(i, Math.sin(x * 0.5 + t * 1.6) * 0.26 + Math.cos((y + x * 0.4) * 0.55 + t * 1.15) * 0.2);
    }
    seaPos.needsUpdate = true;

    /* 부표: 둥실거림 + 오답 흔들림(점점 잦아든다) */
    buoys.forEach((b) => {
      b.group.position.y = Math.sin(t * 2 + b.phase) * 0.1;
      if (b.shake > 0) {
        b.shake = Math.max(0, b.shake - dt);
        b.group.position.x = b.baseX + Math.sin(t * 42) * 0.26 * (b.shake / SHAKE_SEC);
      } else if (b.group.position.x !== b.baseX) {
        b.group.position.x = b.baseX;
      }
    });

    /* 완주 항해: 항로를 따라 일정 속도로 이동 (smoothstep 가감속) */
    if (shipState.active) {
      shipState.t += dt;
      const p = Math.min(1, shipState.t / SAIL_SEC);
      const e = p * p * (3 - 2 * p);
      let d = shipState.total * e;
      let idx = 0;
      while (idx < shipState.segs.length - 1 && d > shipState.segs[idx].len) {
        d -= shipState.segs[idx].len;
        idx++;
      }
      const s = shipState.segs[idx];
      shipPos.copy(s.a).addScaledVector(s.dir, Math.min(d, s.len));
      ship.position.set(shipPos.x, ROUTE_Y + Math.sin(t * 4) * 0.07, shipPos.z);
      ship.lookAt(shipPos.x + s.dir.x, ship.position.y, shipPos.z + s.dir.z);
      if (p >= 1) { shipState.active = false; shipState.doneSail = true; }
    } else if (shipState.doneSail) {
      ship.position.y = ROUTE_Y + Math.sin(t * 3) * 0.06; // 도착 후 정박 둥실거림
    }
  });
  stage.start();

  return { el: stage.el, isComplete: () => done };
}
