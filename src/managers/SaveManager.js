/* =========================================================================
   SaveManager — localStorage 단일 키 저장 (dokdo_exploration_hq_save_v1)
   - 저장 데이터가 없거나 깨져도 기본값으로 복구 (앱이 터지지 않음)
   - version 다르면 migrate: 기본값 위에 아는 필드만 병합
   - 쓰기는 debounce
   ========================================================================= */

const KEY = "dokdo_exploration_hq_save_v1";
const VERSION = 1;

function defaults() {
  return {
    version: VERSION,
    currentPage: "main",
    completedMissions: [],
    unlockedMissions: ["route"],
    missionScores: { route: 0, geology: 0, history: 0, ecology: 0, briefing: 0, presentation: 0 },
    badges: [],
    evidenceCards: [],
    briefingBoard: { location: null, geology: null, history: null, ecology: null, protection: null },
    presentationDraft: { orderedSections: [], sentences: { blanks: {}, closing: "" } },
    reflection: { pledge: "", memorable: null },
    soundEnabled: true,          // 구버전 호환 (migrate 시 아래 두 필드로 복사)
    bgmEnabled: true,
    sfxEnabled: true,
    certificate: { grade: "", classNo: "", studentNo: "" },
    updatedAt: "",
  };
}

function safeLoad() {
  const base = defaults();
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch { return base; }
  if (!raw) return base;
  let data = null;
  try { data = JSON.parse(raw); } catch { console.warn("[save] 손상된 저장 데이터 → 기본값"); return base; }
  if (!data || typeof data !== "object") return base;
  // migrate: 아는 필드만 타입 검사 후 병합
  for (const k of Object.keys(base)) {
    if (!(k in data)) continue;
    if (typeof base[k] === typeof data[k] && (base[k] === null || Array.isArray(base[k]) === Array.isArray(data[k]))) {
      base[k] = data[k];
    } else if (base[k] !== null && typeof base[k] === "object" && data[k] && typeof data[k] === "object") {
      Object.assign(base[k], data[k]);
    }
  }
  base.version = VERSION;
  if (!base.unlockedMissions.includes("route")) base.unlockedMissions.push("route");
  // migrate: 구버전 soundEnabled → bgm/sfx 분리 필드
  if ("soundEnabled" in data && !("bgmEnabled" in data)) {
    base.bgmEnabled = !!data.soundEnabled;
    base.sfxEnabled = !!data.soundEnabled;
  }
  return base;
}

class SaveManager {
  constructor() {
    this.state = safeLoad();
    this._timer = 0;
  }

  get(key) { return this.state[key]; }

  set(key, value) {
    this.state[key] = value;
    this.persist();
  }

  persist() {
    clearTimeout(this._timer);
    this._timer = setTimeout(() => {
      this.state.updatedAt = new Date().toISOString();
      try { localStorage.setItem(KEY, JSON.stringify(this.state)); }
      catch (e) { console.warn("[save] 저장 실패(계속 진행):", e); }
    }, 250);
  }

  hasProgress() {
    return this.state.completedMissions.length > 0 || this.state.evidenceCards.length > 0;
  }

  isCompleted(missionKey) { return this.state.completedMissions.includes(missionKey); }
  isUnlocked(missionKey) { return this.state.unlockedMissions.includes(missionKey); }

  completeMission(missionKey, { badgeId = null, evidence = [], score = 0, unlockNext = null } = {}) {
    const s = this.state;
    if (!s.completedMissions.includes(missionKey)) s.completedMissions.push(missionKey);
    if (badgeId && !s.badges.includes(badgeId)) s.badges.push(badgeId);
    for (const ev of [].concat(evidence)) {
      if (ev && !s.evidenceCards.includes(ev)) s.evidenceCards.push(ev);
    }
    if (score) s.missionScores[missionKey] = Math.max(s.missionScores[missionKey] || 0, score);
    if (unlockNext && !s.unlockedMissions.includes(unlockNext)) s.unlockedMissions.push(unlockNext);
    this.persist();
  }

  setBoardField(field, cardId) {
    this.state.briefingBoard[field] = cardId;
    this.persist();
  }

  setPresentationOrder(order) {
    this.state.presentationDraft.orderedSections = [...order];
    this.persist();
  }

  /** 부분 병합 저장: setReflection({pledge}) / setReflection({memorable:{...}}) */
  setReflection(partial) {
    this.state.reflection = { ...this.state.reflection, ...partial };
    this.persist();
  }

  reset() {
    this.state = defaults();
    clearTimeout(this._timer);
    try { localStorage.removeItem(KEY); } catch { /* 계속 진행 */ }
  }
}

const save = new SaveManager();
export default save;
