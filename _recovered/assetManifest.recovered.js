/* =========================================================================
   AssetManifest - 모든 이미지/사운드 경로 중앙 관리
   규칙(stability_rules): 한글·공백 파일명은 여기서 별칭으로 감싸고
   코드 곳곳에 직접 쓰지 않는다. 에셋 교체 시 이 파일만 수정한다.
   ========================================================================= */

const BG = "public/assets/backgrounds/";
const IC = "public/assets/icons/";
const DK = "public/assets/icons/dokdo/";
const SND = "public/assets/sound/";
const SFX = "public/assets/sound/soundeffects/";

/** 배경 (8장) — 장면별 매핑 */
export const BACKGROUNDS = {
  main:        BG + "ChatGPT Image 2026년 6월 12일 오후 04_36_25 (1).png", // 전망대/독도석
  oceanView:   BG + "ChatGPT Image 2026년 6월 12일 오후 04_36_37 (2).png", // 노을 바다 전망(미션지도)
  classroom:   BG + "ChatGPT Image 2026년 6월 12일 오후 04_36_44 (1).png", // 교실/브리핑실
  briefingDesk:BG + "ChatGPT Image 2026년 6월 12일 오후 04_37_06 (1).png", // 브리핑보드 제작실
  ecology:     BG + "ChatGPT Image 2026년 6월 12일 오후 04_37_15 (1).png", // 생태 관찰소
  archive:     BG + "ChatGPT Image 2026년 6월 12일 오후 04_37_20 (1).png", // 역사 기록 보관소
  geology:     BG + "ChatGPT Image 2026년 6월 12일 오후 04_37_27 (1).png", // 바위섬 분석실
  route:       BG + "ChatGPT Image 2026년 6월 12일 오후 04_37_34 (1).png", // 항로 복원실
};

/** 아이콘 / 오브젝트 / 캐릭터 (번호 PNG를 의미있는 별칭으로) */
export const ICONS = {
  // 캐릭터 / 마스코트
  heroMain:      IC + "originalimg/ChatGPT Image 2026년 6월 12일 오후 10_34_00 (1).png", // 메인 히어로(소년+수달)
  girlExplorer:  IC + "1.png",
  lighthouseMascot: IC + "3.png",
  seagullPostman:IC + "20.png",
  seagullFly:    IC + "82.png",

  // 타이틀 / 배너 (장식 오브젝트)
  titleIsland:   IC + "2.png",   // "독도, 우리의 섬!"
  subtitleBanner:IC + "90.png",  // "사라진 기록을 복원하라!"
  exploreBanner: IC + "91.png",  // "위치·지형·역사·생태 탐험"
  labelStart:    IC + "92.png",  // "탐험 시작"
  labelRecord:   IC + "93.png",  // "탐험 기록"
  bunting:       IC + "5.png",   // 가랜드 장식
  woodSign:      IC + "87.png",  // 독도 나무 표지판
  woodSign2:     IC + "originalimg/ChatGPT Image 2026년 6월 12일 오후 10_20_22.png",

  // 오브젝트
  compass:       IC + "84.png",
  binoculars:    IC + "86.png",
  briefingDoc:   IC + "85.png",  // 브리핑 문서(미션 체크리스트)
  portfolio:     IC + "7.png",   // DOKDO 포트폴리오
  hourglass:     IC + "40.png",  // 역사/시간
  rockCore:      IC + "50.png",  // 지층 코어
  dioramaFlower: IC + "10.png",
  dioramaIsland: IC + "30.png",
  topoModel:     IC + "60.png",
  ecoLeaf:       IC + "81.png",  // 잎+물방울 생태 엠블럼
  ecoDome:       IC + "83.png",  // 유리돔 섬(보호)

  // 미션/완료 배지 (원형 아이콘)
  badgeRoute:    IC + "70.png",  // 항로 지도 배지
  badgeEco:      IC + "78.png",  // 등대 생태 배지
  badgeBriefing: IC + "80.png",  // 이젤 별 배지
};

/** 독도 전용 아이콘 세트 (icons/dokdo — 번호 PNG를 의미있는 별칭으로) */
export const DOKDO = {
  // 스테이지 명패(간판)
  signRoute:     DK + "22.png",  // 항로 복원실
  signGeology:   DK + "30.png",  // 지형 분석실
  signHistory:   DK + "36.png",  // 기록 보관소
  signEcology:   DK + "48.png",  // 생태 수호 구역
  signBriefing:  DK + "62.png",  // 브리핑 보드 제작실
  signPresent:   DK + "67.png",  // 최종 발표 전시관
  signComplete:  DK + "75.png",  // 탐사 수료관
  signDokdo:     DK + "1.png",   // 독도 표지판

  // 완료 배지
  badgeMission:  DK + "26.png",  // MISSION COMPLETE (파랑 원형)
  badgeHistory:  DK + "34.png",  // 역사 탐구 완료
  badgeEcology:  DK + "42.png",  // 수호 완료
  badgeBriefing: DK + "56.png",  // 브리핑 완성
  badgePresent:  DK + "66.png",  // 발표 완료
  badgeFinal:    DK + "74.png",  // DOKDO 수료 대형 배지

  // 캐릭터 / 마스코트
  girlScout:     DK + "10.png",  // 탐험가 소녀(돋보기)
  boyScout:      DK + "12.png",  // 탐험가 소년(가리킴)
  otterSailor:   DK + "23.png",  // 수달 항해사
  boyMap:        DK + "37.png",  // 지도 든 소년
  girlNote:      DK + "46.png",  // 노트 든 소녀
  sageFigure:    DK + "53.png",  // 역사 인물(안용복 풍)
  rangerBoy:     DK + "57.png",  // 체크리스트 소년
  presenterGirl: DK + "63.png",  // 발표 소녀
  seagullMail:   DK + "64.png",  // 갈매기 집배원
  robotGuide:    DK + "17.png",  // 로봇 가이드
  robotCrab:     DK + "43.png",  // 로봇 게(분석)
  lighthouseChar:DK + "79.png",  // 등대 마스코트
  readerGirl:    DK + "80.png",  // 책 읽는 소녀

  // 오브젝트
  binoculars:    DK + "2.png",
  briefingDoc:   DK + "3.png",   // 브리핑 문서
  compass:       DK + "4.png",
  glassDome:     DK + "5.png",   // 유리돔 섬
  gull:          DK + "6.png",
  easelStar:     DK + "7.png",   // 이젤 별 배지
  ecoLeaf:       DK + "8.png",   // 잎+물방울
  lighthouseRing:DK + "9.png",   // 등대 원형 엠블럼
  oldBook:       DK + "11.png",  // 고서+도장
  drawer:        DK + "13.png",  // 서류함
  islandTall:    DK + "14.png",  // 바위섬(단면)
  pinIsland:     DK + "15.png",  // 위치 핀 섬
  coreBadge:     DK + "16.png",  // 지층 원형
  islandGreen:   DK + "18.png",  // 초록 섬
  buoy:          DK + "19.png",  // 독도 부표
  boat:          DK + "20.png",  // 탐사선
  helmBadge:     DK + "21.png",  // 조타 별 배지
  routeScroll:   DK + "27.png",  // 항로 지도 두루마리
  compassRose:   DK + "28.png",  // 나침반 로즈
  routeMapSmall: DK + "29.png",  // 경로 지도
  waterSprite:   DK + "31.png",  // 물 정령
  clipboardRock: DK + "32.png",  // 관찰 클립보드
  chest:         DK + "33.png",  // 기록 상자
  coreSample:    DK + "35.png",  // 지층 코어 튜브
  windRock:      DK + "38.png",  // 바람 바위섬
  cliff:         DK + "39.png",  // 절벽 단면
  tidePool:      DK + "40.png",  // 조수 웅덩이
  fieldNote:     DK + "41.png",  // 관찰 노트
  sealedBook:    DK + "44.png",  // 봉인 기록
  timeline:      DK + "45.png",  // 연표
  hourglass:     DK + "47.png",  // 모래시계
  ecoChecklist:  DK + "49.png",  // 생태 관찰 기록
  wildflower:    DK + "50.png",  // 야생화 바위
  briefingPoint: DK + "51.png",  // 브리핑 포인트
  ecoCycle:      DK + "52.png",  // 생태 순환
  islandModel:   DK + "54.png",  // 독도 모형
  shieldEco:     DK + "55.png",  // 생태 방패
  binder:        DK + "58.png",  // 탐사 바인더
  noticeBoard:   DK + "59.png",  // 독도 안내판
  purpleFlower:  DK + "60.png",  // 보라 들꽃
  keyPoint:      DK + "61.png",  // 핵심 정리
  micIsland:     DK + "69.png",  // 마이크+말풍선
  presentBoard:  DK + "70.png",  // 발표 요약 보드
  droneBot:      DK + "71.png",  // 드론 로봇
  presenterMan:  DK + "72.png",  // 발표자
  snowGlobe:     DK + "65.png",  // 스노우글로브 독도
  photoFrame:    DK + "73.png",  // 독도 사진 액자
  passport:      DK + "77.png",  // 미션 패스포트
  certScroll:    DK + "78.png",  // 수료 두루마리
  flowerField:   DK + "81.png",  // 들꽃 무리
};

/** 사운드 */
export const SOUNDS = {
  bgmMain:   SND + "mainbgm.mp3.mp3",
  bgmStage1: SND + "stage1bgm.mp3.mp3",
  bgmStage2: SND + "stage2bgm.mp3.mp3",
  bgmStage3: SND + "stage3bgm.mp3.mp3",
  bgmStage4: SND + "stage4bgm.mp3.mp3",
  bgmStage5: SND + "stage5bgm.mp3.mp3",
  sfxClick:   SFX + "freesound_community-ui-click-43196.mp3",
  sfxOpen:    SFX + "litupsubway-ui-open-sfx-513358.mp3",
  sfxCorrect: SFX + "meldix-success-340660.mp3",
  sfxWin:     SFX + "freesound_community-badge-coin-win-14675.mp3",
  sfxFail:    SFX + "floraphonic-brass-fail-7-a-207129.mp3",
};

/** 통합 조회 (key 'BG.main' / 'ICONS.compass' 형태도 지원) */
export const AssetManifest = { BACKGROUNDS, ICONS, DOKDO, SOUNDS };
export default AssetManifest;
