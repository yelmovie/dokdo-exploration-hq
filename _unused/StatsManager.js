/* =========================================================================
   StatsManager — 현재 미션의 시도 통계 (탐사 점수 계산용)
   missionFrame 진입 시 reset, quiz/orderInteraction 등이 오답을 집계,
   completeMission 이 점수로 변환한다. (별점 없음)
   ========================================================================= */
const stats = {
  wrong: 0,
  reset() { this.wrong = 0; },
  /** 스펙 가중치: 정확도40 + 근거확인40 + 끈기10 + 완료10 (완주 시점 기준) */
  score() {
    const accuracy = Math.max(0, 40 - 6 * this.wrong);
    return accuracy + 40 + 10 + 10;
  },
};
export default stats;
