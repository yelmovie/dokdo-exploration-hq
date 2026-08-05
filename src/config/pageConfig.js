/* =========================================================================
   pageConfig.js — 10페이지 공통 설정 (배경·제목·BGM·해시 키)
   ========================================================================= */
import { BACKGROUNDS, SOUNDS } from "./assetManifest.js";

const PAGES = {
  main:         { key: "main",         title: "독도 탐사본부",       bg: BACKGROUNDS.main,         bgm: SOUNDS.bgmMain },
  briefing:     { key: "briefing",     title: "탐사본부 브리핑",     bg: BACKGROUNDS.briefing,     bgm: SOUNDS.bgmBriefing },
  missionMap:   { key: "missionMap",   title: "미션 지도",           bg: BACKGROUNDS.missionMap,   bgm: SOUNDS.bgmMap },
  route:        { key: "route",        title: "항로 복원실",         bg: BACKGROUNDS.route,        bgm: SOUNDS.bgmRoute },
  geology:      { key: "geology",      title: "바위섬 분석실",       bg: BACKGROUNDS.geology,      bgm: SOUNDS.bgmGeology },
  history:      { key: "history",      title: "기록 보관소",         bg: BACKGROUNDS.history,      bgm: SOUNDS.bgmHistory },
  ecology:      { key: "ecology",      title: "생태 수호 작전",      bg: BACKGROUNDS.ecology,      bgm: SOUNDS.bgmEcology },
  briefingBoard:{ key: "briefingBoard",title: "브리핑 보드 제작",    bg: BACKGROUNDS.board,        bgm: SOUNDS.bgmBriefing },
  presentation: { key: "presentation", title: "최종 발표 준비",      bg: BACKGROUNDS.presentation, bgm: SOUNDS.bgmBriefing },
  completion:   { key: "completion",   title: "수료 및 전시",        bg: BACKGROUNDS.completion,   bgm: SOUNDS.bgmBriefing },
};

export default PAGES;
