/* SaveManager migrate/setReflection 회귀 테스트 (localStorage 스텁) */
const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

const KEY = "dokdo_exploration_hq_save_v1";

// 1) 기존 세이브(reflection 없음) — 구버전 데이터
const oldSave = {
  version: 1,
  currentPage: "completion",
  completedMissions: ["route", "geology"],
  unlockedMissions: ["route", "geology", "history"],
  badges: ["route"],
  evidenceCards: { "c-loc": true },
  briefingBoard: { location: "c-loc", geology: null, history: null, ecology: null, protection: null },
  presentationDraft: { orderedSections: ["p-greet"], sentences: { "p-greet": "안녕" } },
  settings: { soundEnabled: false, bgmVolume: 0.3, sfxVolume: 0.8 },
  updatedAt: "2026-07-01T00:00:00.000Z",
};
localStorage.setItem(KEY, JSON.stringify(oldSave));

const { SaveManager } = await import("file:///D:/isamgpt/21Dokdo/src/managers/SaveManager.js");

const assert = (cond, msg) => { if (!cond) { console.error("FAIL:", msg); process.exitCode = 1; } else console.log("ok:", msg); };

const d = SaveManager.data;
assert(d.completedMissions.join() === "route,geology", "기존 completedMissions 유지");
assert(d.unlockedMissions.join() === "route,geology,history", "기존 unlockedMissions 유지");
assert(d.badges.join() === "route", "기존 badges 유지");
assert(d.briefingBoard.location === "c-loc", "기존 briefingBoard 유지");
assert(d.presentationDraft.orderedSections[0] === "p-greet", "기존 presentationDraft.orderedSections 유지");
assert(d.presentationDraft.sentences["p-greet"] === "안녕", "기존 presentationDraft.sentences 유지");
assert(d.settings.soundEnabled === false && d.settings.bgmVolume === 0.3, "기존 settings 유지");
assert(d.version === 1, "version 유지(1)");
assert(d.reflection && d.reflection.pledge === "" , "reflection 기본값 생성(pledge)");
assert(d.reflection.memorable && d.reflection.memorable.field === null && d.reflection.memorable.sentence === "", "reflection 기본값 생성(memorable)");

// 2) setReflection 부분 갱신 — pledge만
SaveManager.setReflection({ pledge: "독도를 아끼겠습니다" });
assert(SaveManager.data.reflection.pledge === "독도를 아끼겠습니다", "setReflection pledge 저장");
assert(SaveManager.data.reflection.memorable.field === null, "pledge 저장 시 memorable 보존");

// 3) setReflection 부분 갱신 — memorable만
SaveManager.setReflection({ memorable: { field: "history", sentence: "기록이 남아 있어서" } });
assert(SaveManager.data.reflection.pledge === "독도를 아끼겠습니다", "memorable 저장 시 pledge 보존");
assert(SaveManager.data.reflection.memorable.field === "history", "memorable.field 저장");

// 4) 저장 후 재로드(라운드트립)에서도 유지
const reloaded = SaveManager.load();
assert(reloaded.reflection.pledge === "독도를 아끼겠습니다", "재로드 후 pledge 유지");
assert(reloaded.reflection.memorable.sentence === "기록이 남아 있어서", "재로드 후 memorable 유지");
assert(reloaded.completedMissions.join() === "route,geology", "재로드 후 기존 진행 유지");

// 5) reflection이 부분만 있는(pledge만) 세이브 → memorable 병합 복구
localStorage.setItem(KEY, JSON.stringify({ ...oldSave, reflection: { pledge: "부분" } }));
const partial = SaveManager.load();
assert(partial.reflection.pledge === "부분" && partial.reflection.memorable.field === null, "부분 reflection 병합 복구");

// 6) 깨진 reflection(문자열) → 기본값 복구되는지
localStorage.setItem(KEY, JSON.stringify({ ...oldSave, reflection: "corrupt" }));
const corrupt = SaveManager.load();
assert(typeof corrupt.reflection === "object" && corrupt.reflection.memorable, "깨진 reflection 방어");

console.log(process.exitCode ? "TEST FAILED" : "ALL TESTS PASSED");
