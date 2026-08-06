/* =========================================================================
   AssetManifest — 모든 이미지/사운드 경로 중앙 관리
   규칙: 한글·공백 원본 파일명은 public/assets 에서 의미 기반 이름으로
   최적화 복사해 두었고(원본은 assets/ 에 보존), 코드는 반드시 이 별칭만 쓴다.
   에셋 교체 시 이 파일만 수정한다.
   DOKDO 번호 매핑은 2026-07 옛 앱 assetManifest 에서 복구한 것. (_recovered/)
   ========================================================================= */

const BG = "public/assets/backgrounds/";
const DK = "public/assets/icons/dokdo/";
const SND = "public/assets/sounds/";

/** 에셋 캐시 버전 — 1년 immutable 캐시를 쓰므로, 에셋 파일을 교체하면 반드시 이 숫자를 올린다 */
const V = "?v=2";
function ver(obj) { for (const k in obj) if (typeof obj[k] === "string") obj[k] += V; return obj; }

/** 배경 — 10페이지 / 8장 (main·map, briefing·presentation 은 재사용) */
export const BACKGROUNDS = ver({
  main:         BG + "bg_main.jpg",        // 노을 전망대 (1p)
  missionMap:   BG + "bg_main.jpg",        // 재사용 (3p — 지도 패널이 화면 대부분을 덮음)
  briefing:     BG + "bg_briefing.jpg",    // 교실 브리핑 (2p)
  presentation: BG + "bg_briefing.jpg",    // 재사용 (9p)
  route:        BG + "bg_route.jpg",       // 항로 복원실 (4p)
  geology:      BG + "bg_geology.jpg",     // 바위섬 분석실 (5p)
  history:      BG + "bg_history.jpg",     // 기록 보관소 (6p)
  ecology:      BG + "bg_ecology.jpg",     // 생태 관찰 데크 (7p)
  board:        BG + "bg_board.jpg",       // 브리핑 보드 제작실 (8p)
  completion:   BG + "bg_completion.jpg",  // 표지석 무대 (10p)
});

/** 독도 아이콘 세트 (번호 PNG → 의미 별칭, 옛 앱에서 복구) */
export const DOKDO = ver({
  // 타이틀
  titleLogo:     DK + "title_logo.png",  // "독도, 우리의 섬!" 로고

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
});

/** 옛 icons/ 세트 별칭 — 원본이 사라져 DOKDO 세트로 대체 매핑 (복구 씬 호환용) */
export const ICONS = {
  dioramaIsland: DOKDO.islandModel,
  bunting:       DOKDO.flowerField,
};

/** 사운드 — BGM 7곡 (효과음 파일은 없음: AudioManager 가 WebAudio 비프로 대체) */
export const SOUNDS = ver({
  bgmMain:     SND + "bgm_main.mp3",      // 1p (Compass to Dokdo)
  bgmMap:      SND + "bgm_map.mp3",       // 3p (Dokdo Tide Map)
  bgmRoute:    SND + "bgm_route.mp3",     // 4p (Dokdo Sea Quest)
  bgmGeology:  SND + "bgm_geology.mp3",   // 5p (Dokdo Stone Notes)
  bgmHistory:  SND + "bgm_history.mp3",   // 6p (Archive Timeline)
  bgmEcology:  SND + "bgm_ecology.mp3",   // 7p (Dokdo Tide Garden)
  bgmBriefing: SND + "bgm_briefing.mp3",  // 2p·8~10p (Dokdo Final Briefing)
});

export const AssetManifest = { BACKGROUNDS, DOKDO, ICONS, SOUNDS };
export default AssetManifest;
