/* =========================================================================
   I18nManager — 다국어 (한국어 원문 기준 사전 치환 방식)
   - 사전: src/data/i18n/{en,zh,ja}.js — STRINGS(원문→번역) + PATTERNS(정규식)
   - 씬 코드는 그대로 두고, 렌더된 DOM 텍스트를 치환한다 (무빌드 유지)
   - 외교 원칙: Dokdo/独岛/独島·East Sea/东海/東海 — 사전에서 강제
   - 캔버스(수료증)는 DOM 이 아니라 한국어 유지
   ========================================================================= */
const KEY = "dokdo_lang";
const LANGS = { ko: "한국어", en: "English", zh: "中文", ja: "日本語" };

const I18n = {
  lang: (() => {
    try { const v = localStorage.getItem(KEY); return LANGS[v] ? v : "ko"; } catch { return "ko"; }
  })(),
  dict: null,
  patterns: [],
  LANGS,

  async init() {
    document.documentElement.lang = this.lang;
    if (this.lang === "ko") return;
    try {
      const m = await import(`../data/i18n/${this.lang}.js`);
      this.dict = m.STRINGS || {};
      this.patterns = (m.PATTERNS || []).map(([re, tpl]) => {
        try { return [new RegExp(re), tpl]; } catch { return null; }
      }).filter(Boolean);
      this.translateTree(document.body);
      this.observe();
    } catch (e) {
      console.warn("[i18n] 사전 로딩 실패 — 한국어로 표시:", e);
      this.dict = null;
    }
  },

  setLang(lang) {
    try { localStorage.setItem(KEY, LANGS[lang] ? lang : "ko"); } catch { /* 무시 */ }
  },

  /** 문자열 1개 번역 — 없으면 null */
  tStr(s) {
    if (!this.dict || !s) return null;
    const hit = this.dict[s];
    if (hit) return hit;
    for (const [re, tpl] of this.patterns) {
      const m = s.match(re);
      if (!m) continue;
      // $n 캡처: 사전에 있으면 캡처도 번역 (미션 제목 등)
      const out = tpl.replace(/\$(\d+)/g, (_, n) => {
        const cap = m[Number(n)] ?? "";
        return this.dict[cap] || cap;
      });
      // 출력이 입력과 같으면(이미 번역됨) 무시 — 통과형 패턴 무한 루프 방지
      if (out !== s) return out;
    }
    // 폴백: "이모지 + 텍스트" 조합은 이모지를 떼고 재조회 (📔 분석 정리 노트 등)
    const em = s.match(/^([\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}⭐✅❌][️]?\s+)(.+)$/u);
    if (em) {
      const rest = this.dict[em[2]];
      if (rest) return em[1] + rest;
    }
    return null;
  },

  /** 코드에서 직접 쓰는 번역 헬퍼 (없으면 원문) */
  t(s) { return this.tStr(s) || s; },

  _skip(el) {
    const tag = el.tagName;
    return tag === "SCRIPT" || tag === "STYLE" || tag === "IFRAME" || tag === "CANVAS" || tag === "TEXTAREA";
  },

  /** 요소 1개 번역: 텍스트 전용 → textContent, 인라인 태그 포함 → innerHTML */
  translateEl(el) {
    if (!el.isConnected || this._skip(el)) return;
    // 속성
    for (const attr of ["title", "aria-label", "placeholder"]) {
      const v = el.getAttribute && el.getAttribute(attr);
      if (v) { const r = this.tStr(v); if (r && r !== v) el.setAttribute(attr, r); }
    }
    if (el.childElementCount === 0) {
      const s = el.textContent;
      if (!s || !/[가-힣]/.test(s)) return; // 한국어가 없으면 이미 번역된 것 — 건드리지 않는다
      const r = this.tStr(s) || this.tStr(s.trim());
      if (r && r !== s) el.textContent = r;
      return;
    }
    // <b>/<u> 등 인라인 조합 문자열 (innerHTML 이 사전 키)
    const html = el.innerHTML;
    if (html && html.length < 2400 && /[가-힣]/.test(html) && !html.includes("<div") && !html.includes("<button")) {
      const r = this.tStr(html);
      if (r && r !== html) { el.innerHTML = r; return; }
    }
  },

  translateTree(root) {
    if (!this.dict || !root) return;
    if (root.nodeType === 3) { root = root.parentElement; if (!root) return; }
    if (root.nodeType !== 1) return;
    // 조합(innerHTML) 매칭이 우선되도록 부모→자식 순서로
    this.translateEl(root);
    if (!root.isConnected) return;
    const els = root.querySelectorAll("*");
    for (const el of els) this.translateEl(el);
  },

  observe() {
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        if (m.type === "characterData") {
          // 타이핑 애니메이션 등 — 문장이 완성되는 순간 치환된다
          const p = m.target.parentElement;
          if (p) this.translateEl(p);
        } else {
          m.addedNodes.forEach((n) => this.translateTree(n));
        }
      }
      mo.takeRecords(); // 우리 자신의 치환이 만든 변경 기록은 버린다 (루프 방지)
    });
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  },
};

export default I18n;
