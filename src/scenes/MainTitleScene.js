/* =========================================================================
   1페이지 - 메인 화면 (MainTitleScene)
   타이틀 로고 + 캐릭터 + 탐사 시작 / 이어하기(저장 감지) / 선생님 안내.
   설정: 소리 켜기/끄기, 처음부터 다시(선생님용 리셋), 생성형 이미지 고지.
   ========================================================================= */
import { el, assetImg } from "../core/dom.js";
import { buildScene, placeAsset, button, modal, toast } from "../components/ui.js";
import { DOKDO } from "../config/assetManifest.js";
import PAGES from "../config/pageConfig.js";
import AudioManager from "../managers/AudioManager.js";

export default function MainTitleScene(ctx) {
  const cfg = PAGES.main;
  const { root, layer } = buildScene({ bg: cfg.bg, veil: "soft" });
  const hasSave = ctx.save.hasProgress();

  /* ---- 타이틀 로고 + 부제 ---- */
  const logo = assetImg(DOKDO.titleLogo, "독도, 우리의 섬!");
  Object.assign(logo.style, {
    position: "absolute", left: "50%", top: "48px", transform: "translateX(-50%)",
    width: "520px", zIndex: 5, filter: "drop-shadow(0 8px 16px rgba(0,0,0,.35))",
  });
  logo.classList.add("floaty");
  layer.appendChild(logo);

  layer.appendChild(el("div", {
    style: {
      position: "absolute", left: "50%", top: "348px", transform: "translateX(-50%)",
      zIndex: 5, background: "rgba(20,54,92,.88)", color: "#fff",
      fontSize: "21px", fontWeight: "900", padding: "10px 30px", borderRadius: "999px",
      boxShadow: "var(--shadow)", whiteSpace: "nowrap",
    },
    text: "독도 탐사본부 · 사라진 기록을 복원하라!",
  }));

  layer.appendChild(el("div", {
    style: {
      position: "absolute", left: "50%", top: "406px", transform: "translateX(-50%)",
      zIndex: 5, color: "#fff", fontSize: "15px", fontWeight: "700",
      textShadow: "0 1px 4px rgba(0,0,0,.6)", whiteSpace: "nowrap",
    },
    text: "위치 · 지형 · 역사 · 생태 · 보호 — 5가지 근거를 모아 브리핑 보드를 완성해요",
  }));

  /* ---- 캐릭터 ---- */
  placeAsset(layer, DOKDO.girlScout, { x: 60, y: 330, w: 280, h: 380, alt: "탐험가 소녀", z: 4 });
  placeAsset(layer, DOKDO.otterSailor, { x: 990, y: 400, w: 230, h: 300, alt: "수달 항해사", float: true, z: 4 });
  placeAsset(layer, DOKDO.gull, { x: 880, y: 90, w: 110, h: 90, alt: "갈매기", float: true, z: 3 });

  /* ---- 하단 버튼 (CSS) ---- */
  const btnRow = el("div.row", {
    style: { position: "absolute", left: "50%", bottom: "56px", transform: "translateX(-50%)", gap: "16px", zIndex: 6 },
  }, [
    button(hasSave ? "이어하기" : "탐사 시작", { variant: "gold", size: "lg", icon: hasSave ? "▶" : "🧭", onClick: () => {
      ctx.navigate(hasSave ? "missionMap" : "briefing");
    } }),
    hasSave ? button("처음부터", { variant: "sea", size: "lg", icon: "🧭", onClick: () => ctx.navigate("briefing") }) : null,
    button("선생님 안내", { variant: "ghost", size: "lg", icon: "🧑‍🏫", onClick: openTeacherGuide }),
  ].filter(Boolean));
  layer.appendChild(btnRow);

  /* ---- 우상단: 설정 ---- */
  layer.appendChild(el("div", { style: { position: "absolute", right: "22px", top: "20px", zIndex: 10 } }, [
    button("설정", { variant: "ghost", size: "sm", icon: "⚙️", onClick: openSettings }),
  ]));

  function openSettings() {
    const soundBtn = button(AudioManager.enabled ? "소리 끄기" : "소리 켜기", {
      variant: "sea", icon: AudioManager.enabled ? "🔇" : "🔊",
      onClick: () => {
        AudioManager.setEnabled(!AudioManager.enabled);
        md.close();
        toast(ctx.stage, AudioManager.enabled ? "소리를 켰어요" : "소리를 껐어요");
      },
    });
    const body = el("div.col", { style: { gap: "12px" } }, [
      el("div.row", { style: { justifyContent: "center" } }, [soundBtn]),
      el("div", {
        style: { fontSize: "12.5px", fontWeight: "600", color: "var(--ink-soft)", lineHeight: "1.5", textAlign: "center", wordBreak: "keep-all" },
        text: "이 앱의 배경·캐릭터·아이콘 그림은 생성형 AI로 만든 교육용 이미지입니다.",
      }),
    ]);
    const md = modal(ctx.stage, {
      title: "설정", icon: "⚙️", body,
      buttons: [button("닫기", { variant: "ghost", onClick: () => md.close() })],
    });
  }

  function openTeacherGuide() {
    const body = el("div.col", { style: { gap: "10px", maxWidth: "560px" } }, [
      el("div", { style: { fontSize: "15px", fontWeight: "700", color: "var(--ink)", lineHeight: "1.65", wordBreak: "keep-all" },
        html: "초등 4학년 사회·통합 독도교육용 <b>자료 해석형 탐사 웹앱</b>입니다.<br>" +
          "· 40분 수업 흐름: 도입 5분 → 미션 1~4단계 20분 → 브리핑 보드·발표 준비 10분 → 수료·공유 5분<br>" +
          "· 진행 기록은 이 기기 브라우저에만 저장됩니다(서버 없음).<br>" +
          "· 오답 시 정답을 바로 알려 주지 않고 오개념 피드백·힌트로 재도전을 유도합니다." }),
      el("div", {
        style: { fontSize: "13.5px", fontWeight: "700", color: "var(--ink-soft)", lineHeight: "1.6", background: "#f0f4f8", borderRadius: "10px", padding: "10px 14px", wordBreak: "keep-all" },
        html: "<b>교육과정 연계</b> · 범교과 학습 주제 ‘독도 교육’ 기반, 2022 개정 사회과 <b>[6사01-02]</b>" +
          "(독도의 지리적 특성과 역사 기록을 바탕으로 영토로서 독도의 중요성 이해)와 연계한 4학년 심화 활동입니다." +
          "<br><span style='color:#a05a1a'>※ 성취기준 원문은 수업 전 교육과정 고시 원문과 대조해 확인해 주세요.</span>" +
          "<br>교육 내용 출처: 대한민국 외교부 독도(dokdo.mofa.go.kr)" }),
      el("div.row", { style: { justifyContent: "center", marginTop: "4px" } }, [
        button("전체 기록 초기화", { variant: "ghost", size: "sm", icon: "🗑️", onClick: () => {
          const md2 = modal(ctx.stage, {
            title: "기록을 초기화할까요?", icon: "⚠️",
            bodyHtml: "이 기기의 탐사 기록(미션·배지·발표문)이 모두 지워져요.",
            buttons: [
              button("취소", { variant: "ghost", onClick: () => md2.close() }),
              button("초기화", { variant: "green", onClick: () => {
                ctx.save.reset();
                md2.close(); md.close();
                toast(ctx.stage, "기록을 초기화했어요. 새로 시작할 수 있어요!");
                setTimeout(() => location.reload(), 700);
              } }),
            ],
          });
        } }),
      ]),
    ]);
    const md = modal(ctx.stage, {
      title: "선생님 안내", icon: "🧑‍🏫", body,
      buttons: [button("닫기", { variant: "ghost", onClick: () => md.close() })],
    });
  }

  return root;
}
