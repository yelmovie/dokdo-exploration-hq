/* =========================================================================
   1페이지 - 메인 화면 (MainTitleScene)
   정적 타이틀 로고(배경을 가리지 않게 상단), 캐릭터 크게, 버튼 3개 이하.
   설정 모달: 소리(배경음/효과음 분리) · 교사용 가이드 · 관리자 · AI 고지.
   ========================================================================= */
import { el, assetImg } from "../core/dom.js";
import { buildScene, placeAsset, button, iconButton, modal, toast } from "../components/ui.js";
import { DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import { MISSIONS } from "../data/missions.js";
import AudioManager from "../managers/AudioManager.js";
import I18n from "../managers/I18nManager.js";

export default function MainTitleScene(ctx) {
  const cfg = PAGES.main;
  const { root, layer } = buildScene({ bg: cfg.bg });
  const hasSave = ctx.save.hasProgress();

  /* ---- 타이틀 로고: 정적, 상단 좌측 치우침 — 노을·독도 배경이 보이게 ---- */
  const logo = assetImg(DOKDO.titleLogo, "독도, 우리의 섬!");
  Object.assign(logo.style, {
    position: "absolute", left: "50%", top: "30px", transform: "translateX(-50%)",
    width: "440px", zIndex: 5,
    filter: "drop-shadow(0 10px 22px rgba(9, 28, 48, .45))",
  });
  layer.appendChild(logo);

  layer.appendChild(el("div", {
    style: {
      position: "absolute", left: "50%", top: "336px", transform: "translateX(-50%)",
      zIndex: 5, background: "rgba(14, 38, 64, .72)",
      backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,.25)",
      color: "#fff", fontSize: "18px", fontWeight: "800", letterSpacing: "-0.01em",
      padding: "10px 28px", borderRadius: "999px",
      boxShadow: "0 8px 24px rgba(9,28,48,.35)", whiteSpace: "nowrap",
    },
    text: "독도 탐사본부 — 사라진 기록을 복원하라",
  }));

  /* ---- 캐릭터: 1.5배, 하단 기준 배치 (잘림 방지: 720 안쪽) ---- */
  placeAsset(layer, DOKDO.otterSailor, { x: 34, y: 344, w: 345, h: 425, alt: "강치 항해사", float: true, z: 4, shadow: true });
  placeAsset(layer, DOKDO.girlScout, { x: 790, y: 242, w: 420, h: 500, alt: "탐험가 소녀", z: 4, shadow: true });
  placeAsset(layer, DOKDO.gull, { x: 850, y: 70, w: 100, h: 82, alt: "갈매기", float: true, z: 3 });

  /* ---- 하단 버튼 ---- */
  const btnRow = el("div.row", {
    style: { position: "absolute", left: "50%", bottom: "52px", transform: "translateX(-50%)", gap: "14px", zIndex: 6 },
  }, [
    button(hasSave ? "이어하기" : "탐사 시작", { variant: "gold", size: "lg", icon: hasSave ? "▶" : "⚓", onClick: () => {
      ctx.navigate(hasSave ? "missionMap" : "briefing");
    } }),
    hasSave ? button("처음부터", { variant: "sea", size: "lg", onClick: () => ctx.navigate("briefing") }) : null,
  ].filter(Boolean));
  btnRow.querySelectorAll(".btn").forEach((b) => { b.style.width = "200px"; }); // 두 버튼 가로 통일
  layer.appendChild(btnRow);

  /* ---- 우측 상단: 소리 · 설정 아이콘 ---- */
  const soundOn = () => AudioManager.bgmEnabled || AudioManager.sfxEnabled;
  const soundBtn = iconButton(soundOn() ? "🔊" : "🔇", { title: "소리 켜기/끄기", onClick: () => {
    const on = !soundOn();
    AudioManager.setBgmEnabled(on);
    AudioManager.setSfxEnabled(on);
    soundBtn.querySelector(".btn__icon").textContent = on ? "🔊" : "🔇";
    toast(ctx.stage, on ? "소리를 켰어요" : "소리를 껐어요");
  } });
  layer.appendChild(el("div.row", { style: { position: "absolute", right: "22px", top: "20px", gap: "10px", zIndex: 12 } }, [
    soundBtn,
    iconButton("⚙️", { title: "설정", onClick: openSettings }),
  ]));

  /* =======================================================================
     설정 모달 — 소리 / 교사용 가이드 / 관리자 / 고지
     ======================================================================= */
  function toggleRow(label, get, set) {
    const btn = el("button", {
      type: "button",
      style: {
        fontFamily: "inherit", fontSize: "14px", fontWeight: "900", minWidth: "72px", minHeight: "40px",
        borderRadius: "999px", border: "0", cursor: "pointer",
        background: get() ? "var(--green)" : "#aeb9c4", color: "#fff",
      },
      text: get() ? "켜짐" : "꺼짐",
    });
    btn.addEventListener("click", () => {
      set(!get());
      btn.style.background = get() ? "var(--green)" : "#aeb9c4";
      btn.textContent = get() ? "켜짐" : "꺼짐";
    });
    return el("div.row", { style: { justifyContent: "space-between", alignItems: "center", padding: "8px 2px" } }, [
      el("span", { style: { fontSize: "15.5px", fontWeight: "800", color: "var(--ink)" }, text: label }),
      btn,
    ]);
  }

  function sectionTitle(text) {
    return el("div", { style: { fontSize: "13px", fontWeight: "900", color: "var(--sea-deep)", letterSpacing: ".04em", margin: "10px 0 2px", borderBottom: "1px solid rgba(20,86,143,.15)", paddingBottom: "5px" }, text });
  }

  function openSettings() {
    const body = el("div.col", { style: { gap: "4px", minWidth: "420px" } }, [
      sectionTitle("소리"),
      toggleRow("배경 음악", () => AudioManager.bgmEnabled, (v) => AudioManager.setBgmEnabled(v)),
      toggleRow("효과음", () => AudioManager.sfxEnabled, (v) => AudioManager.setSfxEnabled(v)),

      sectionTitle("언어 · Language"),
      el("div.row", { style: { gap: "8px", padding: "6px 0", flexWrap: "wrap" } },
        Object.entries(I18n.LANGS).map(([code, label]) => {
          const active = I18n.lang === code;
          const b = el("button", {
            type: "button",
            style: {
              fontFamily: "inherit", fontSize: "14.5px", fontWeight: "900", minHeight: "42px",
              padding: "8px 18px", borderRadius: "999px", cursor: "pointer",
              border: active ? "2.5px solid var(--sea)" : "2px solid #b9c7d6",
              background: active ? "#eaf4fd" : "#fff",
              color: active ? "var(--sea-deep)" : "var(--ink)",
            },
            text: label,
          });
          b.addEventListener("click", () => {
            if (I18n.lang === code) return;
            I18n.setLang(code);
            location.reload(); // 사전 로딩 + 전체 씬 재렌더
          });
          return b;
        })),

      sectionTitle("교사용"),
      el("div.row", { style: { gap: "8px", padding: "6px 0" } }, [
        button("수업 가이드", { variant: "ghost", size: "sm", onClick: openTeacherGuide }),
        button("관리자", { variant: "ghost", size: "sm", onClick: openAdmin }),
      ]),

      sectionTitle("안내"),
      el("div", {
        style: { fontSize: "12.5px", fontWeight: "600", color: "var(--ink-soft)", lineHeight: "1.55", wordBreak: "keep-all", padding: "4px 0" },
        text: "이 앱의 배경·캐릭터·아이콘 그림과 배경 음악은 생성형 AI로 만든 교육용 자료입니다. 교육 내용은 대한민국 외교부 독도(dokdo.mofa.go.kr) 자료를 근거로 합니다.",
      }),
    ]);
    const md = modal(ctx.stage, {
      title: "설정", icon: "⚙", body,
      buttons: [button("닫기", { variant: "green", onClick: () => md.close() })],
    });
  }

  function openTeacherGuide() {
    const body = el("div.col", { style: { gap: "10px", maxWidth: "560px" } }, [
      el("div", { style: { fontSize: "15px", fontWeight: "700", color: "var(--ink)", lineHeight: "1.65", wordBreak: "keep-all" },
        html: "독도교육용 <b>자료 해석형 탐사 웹앱</b>입니다.<br>" +
          "· 수업 흐름: 도입 → 미션 1~4단계 → 브리핑 보드·발표 준비 → 수료·공유<br>" +
          "· 진행 기록은 이 기기 브라우저에만 저장됩니다(서버 없음). 수업은 한 주소로만 진행하세요.<br>" +
          "· 오답 시 정답을 바로 알려 주지 않고 오개념 피드백과 힌트로 재도전을 유도합니다." }),
      el("div", {
        style: { fontSize: "13.5px", fontWeight: "700", color: "var(--ink-soft)", lineHeight: "1.6", background: "rgba(31,122,194,.08)", borderRadius: "10px", padding: "10px 14px", wordBreak: "keep-all" },
        html: "<b>교육과정 연계</b> · 범교과 학습 주제 ‘독도 교육’ 기반, 2022 개정 사회과 <b>[6사01-02]</b>" +
          "(독도의 지리적 특성과 역사 기록을 바탕으로 영토로서 독도의 중요성 이해)와 연계한 심화 활동입니다." +
          "<br><span style='color:#a05a1a'>※ 성취기준 원문은 수업 전 교육과정 고시 원문과 대조해 확인해 주세요.</span>",
      }),
      el("div", {
        style: { fontSize: "13.5px", fontWeight: "700", color: "var(--ink)", lineHeight: "1.7", background: "rgba(201,150,42,.1)", borderRadius: "10px", padding: "10px 14px", wordBreak: "keep-all" },
        html: "<b>더 배우기 (수업 자료)</b><br>" +
          "· <a href='https://dokdo.mofa.go.kr/kor/pds/video_list02.jsp' target='_blank' rel='noopener' style='color:var(--sea-deep)'>외교부 독도 영상관 — 교육 영상·사진 자료</a><br>" +
          "· <a href='https://dokdo.mofa.go.kr/kor/' target='_blank' rel='noopener' style='color:var(--sea-deep)'>외교부 독도 홈페이지 — 우리 영토인 근거</a><br>" +
          "<span style='color:var(--ink-soft);font-size:12.5px'>영상은 학생과 함께 교사 기기에서 재생을 권장해요.</span>",
      }),
    ]);
    const md = modal(ctx.stage, {
      title: "교사용 수업 가이드", icon: "📖", body,
      buttons: [button("닫기", { variant: "ghost", onClick: () => md.close() })],
    });
  }

  function openAdmin() {
    const gate = modal(ctx.stage, {
      title: "관리자 확인", icon: "🔐",
      bodyHtml: "<div style='font-size:14.5px;font-weight:700;color:var(--ink);line-height:1.6'>교사·관리자용 기능입니다.<br>학생은 선생님과 함께 사용해요.</div>",
      buttons: [
        button("취소", { variant: "ghost", onClick: () => gate.close() }),
        button("교사입니다", { variant: "sea", onClick: () => { gate.close(); openAdminPanel(); } }),
      ],
    });
  }

  function openAdminPanel() {
    const body = el("div.col", { style: { gap: "10px", minWidth: "420px" } }, [
      el("div", { style: { fontSize: "14px", fontWeight: "700", color: "var(--ink-soft)", lineHeight: "1.5", wordBreak: "keep-all" },
        text: "시범·복습 수업용 기능이에요. 이 기기의 기록에만 적용됩니다." }),
      el("div.col", { style: { gap: "10px", alignItems: "stretch" } }, [
        button("전체 단계 해금", { variant: "gold", onClick: () => {
          const all = MISSIONS.map((m) => m.key);
          ctx.save.set("unlockedMissions", all);
          toast(ctx.stage, "모든 단계를 열었어요!");
        } }),
        button("전체 기록 초기화", { variant: "ghost", onClick: () => {
          const md2 = modal(ctx.stage, {
            title: "기록을 초기화할까요?", icon: "⚠️",
            bodyHtml: "이 기기의 탐사 기록(미션·배지·발표문)이 모두 지워져요.",
            buttons: [
              button("취소", { variant: "ghost", onClick: () => md2.close() }),
              button("초기화", { variant: "green", onClick: () => {
                ctx.save.reset();
                md2.close();
                toast(ctx.stage, "기록을 초기화했어요.");
                setTimeout(() => location.reload(), 700);
              } }),
            ],
          });
        } }),
      ]),
    ]);
    const md = modal(ctx.stage, {
      title: "관리자", icon: "🔐", body,
      buttons: [button("닫기", { variant: "ghost", onClick: () => md.close() })],
    });
  }

  return root;
}
