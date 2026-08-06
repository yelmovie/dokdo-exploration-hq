/* =========================================================================
   AudioManager — BGM(mp3) + 효과음(WebAudio 합성 비프)
   - 배경음/효과음 개별 ON/OFF (설정에서 분리 제어, 저장 유지)
   - 파일이 없거나 재생이 막혀도 앱은 계속 진행
   ========================================================================= */
import save from "./SaveManager.js";

class AudioManagerClass {
  constructor() {
    this.bgmEnabled = save.get("bgmEnabled") !== false;
    this.sfxEnabled = save.get("sfxEnabled") !== false;
    this.bgmEl = null;
    this.bgmSrc = "";
    this.actx = null;
    this.unlocked = false;
  }

  /** 첫 사용자 제스처에서 호출 — 오디오 컨텍스트/자동재생 잠금 해제 */
  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;
    try {
      this.actx = this.actx || new (window.AudioContext || window.webkitAudioContext)();
      if (this.actx.state === "suspended") this.actx.resume();
    } catch { this.actx = null; }
    if (this.bgmEnabled && this.bgmEl && this.bgmEl.paused) {
      this.bgmEl.play().catch(() => {});
    }
  }

  setBgmEnabled(on) {
    this.bgmEnabled = !!on;
    save.set("bgmEnabled", this.bgmEnabled);
    if (!this.bgmEnabled) { if (this.bgmEl) this.bgmEl.pause(); }
    else if (this.bgmEl) this.bgmEl.play().catch(() => {});
  }

  setSfxEnabled(on) {
    this.sfxEnabled = !!on;
    save.set("sfxEnabled", this.sfxEnabled);
  }

  playBgm(src) {
    if (!src) return;
    if (this.bgmSrc === src && this.bgmEl && !this.bgmEl.paused) return;
    this.stopBgm();
    this.bgmSrc = src;
    const a = new Audio(src);
    a.loop = true;
    a.volume = 0.28;
    a.addEventListener("error", () => console.warn("[audio] BGM 로딩 실패(계속 진행):", src), { once: true });
    this.bgmEl = a;
    if (this.bgmEnabled && this.unlocked) a.play().catch(() => {});
  }

  stopBgm() {
    if (this.bgmEl) { this.bgmEl.pause(); this.bgmEl.src = ""; }
    this.bgmEl = null;
    this.bgmSrc = "";
  }

  /** 합성 효과음 (freq[], 길이) */
  _beep(freqs, dur = 0.12, type = "sine", gain = 0.08) {
    if (!this.sfxEnabled || !this.actx) return;
    try {
      const t0 = this.actx.currentTime;
      freqs.forEach((f, i) => {
        const o = this.actx.createOscillator();
        const g = this.actx.createGain();
        o.type = type;
        o.frequency.value = f;
        g.gain.setValueAtTime(gain, t0 + i * dur);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + (i + 1) * dur);
        o.connect(g).connect(this.actx.destination);
        o.start(t0 + i * dur);
        o.stop(t0 + (i + 1) * dur + 0.02);
      });
    } catch { /* 계속 진행 */ }
  }

  click()   { this._beep([660], 0.06, "triangle", 0.05); }
  open()    { this._beep([440, 660], 0.08, "sine", 0.05); }
  correct() { this._beep([523, 659, 784], 0.11, "sine", 0.07); }
  wrong()   { this._beep([220, 180], 0.14, "square", 0.04); }
  badge()   { this._beep([523, 659, 784, 1047], 0.12, "sine", 0.08); }
}

const AudioManager = new AudioManagerClass();
export default AudioManager;
