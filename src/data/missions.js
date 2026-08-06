/* =========================================================================
   missions.js — 미션 순서·해금 규칙·배지·브리핑 보드 5영역 정의
   해금: 항로 → 지형 → 역사 → 생태 → 브리핑 보드 (spec progression 절)
   ========================================================================= */
import { DOKDO } from "../config/assetManifest.js";

export const MISSIONS = [
  {
    key: "route", order: 1, title: "1단계 항로 복원실", icon: "🧭", difficulty: 1,
    pageKey: "route", evidenceField: "location",
    desc: "방향·거리·지도 단서를 함께 읽고 울릉도→독도 항로를 복원해요.",
    badge: { id: "b-route", name: "항로 복원", icon: DOKDO.badgeMission },
  },
  {
    key: "geology", order: 2, title: "2단계 바위섬 분석실", icon: "⛰️", difficulty: 2,
    pageKey: "geology", evidenceField: "geology",
    desc: "지형 단서 4개를 관찰해 모으고, 지형과 생활 조건을 연결해요.",
    badge: { id: "b-geology", name: "지형 분석", icon: DOKDO.coreBadge },
  },
  {
    key: "history", order: 3, title: "3단계 기록 보관소", icon: "📜", difficulty: 2,
    pageKey: "history", evidenceField: "history",
    desc: "역사 기록 카드를 연표에 배열하고 사실과 생각을 구분해요.",
    badge: { id: "b-history", name: "역사 탐구", icon: DOKDO.badgeHistory },
  },
  {
    key: "ecology", order: 4, title: "4단계 생태 수호 작전", icon: "🌿", difficulty: 2,
    pageKey: "ecology", evidenceField: "ecology",
    desc: "생태 단서를 읽고 가장 알맞은 보호 행동을 판단해요.",
    badge: { id: "b-ecology", name: "생태 수호", icon: DOKDO.badgeEcology },
  },
  {
    key: "briefing", order: 5, title: "5단계 브리핑 보드 제작", icon: "📌", difficulty: 3,
    pageKey: "briefingBoard", evidenceField: "protection",
    desc: "모은 근거 카드를 5개 영역에 배치해 브리핑 보드를 완성해요.",
    badge: { id: "b-briefing", name: "브리핑 완성", icon: DOKDO.badgeBriefing },
  },
  {
    key: "presentation", order: 6, title: "최종 발표 준비", icon: "🎤", difficulty: 3,
    pageKey: "presentation", evidenceField: null,
    desc: "발표 순서를 정하고 근거가 담긴 발표문을 완성해요.",
    badge: { id: "b-present", name: "발표 완료", icon: DOKDO.badgePresent },
  },
];

/** 브리핑 보드 5영역 */
export const BRIEFING_FIELDS = [
  { key: "location",   icon: "📍", label: "위치", color: "#1f7ac2" },
  { key: "geology",    icon: "⛰️", label: "지형", color: "#8a5a2b" },
  { key: "history",    icon: "📜", label: "역사", color: "#7048b6" },
  { key: "ecology",    icon: "🌿", label: "생태", color: "#1d6b2e" },
  { key: "protection", icon: "🛡️", label: "보호", color: "#b23a09" },
];

/** 미션 키 → 페이지(씬) 키. "briefing" 미션은 briefingBoard 페이지로 간다(함정 주의). */
export function missionPageKey(missionKey) {
  const m = MISSIONS.find((x) => x.key === missionKey);
  return m ? m.pageKey : missionKey;
}

/** 이 미션 완료 시 해금되는 다음 미션 키 */
export function nextMissionOf(missionKey) {
  const m = MISSIONS.find((x) => x.key === missionKey);
  if (!m) return null;
  const nx = MISSIONS.find((x) => x.order === m.order + 1);
  return nx ? nx.key : null;
}

/** 5개 조사 미션(발표 제외)이 모두 완료됐는가 */
export function isAllComplete(completed = []) {
  return MISSIONS.filter((m) => m.order <= 5).every((m) => completed.includes(m.key));
}
