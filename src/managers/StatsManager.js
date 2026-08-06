/* =========================================================================
   StatsManager — 현재 미션의 시도 통계 (별점 계산용)
   missionFrame 진입 시 reset, quiz/orderInteraction 등이 오답을 집계,
   completeMission 이 점수·별점으로 변환한다.
   ========================================================================= */
const stats = {
  wrong: 0,
  reset() { this.wrong = 0; },
  /** 스펙 가중치: 정확도40 + 근거확인40 + 끈기10 + 완료10 (완주 시점 기준) */
  score() {
    const accuracy = Math.max(0, 40 - 6 * this.wrong);
    return accuracy + 40 + 10 + 10;
  },
  stars(score = this.score()) {
    return score >= 90 ? 3 : score >= 70 ? 2 : 1;
  },
};
export default stats;
