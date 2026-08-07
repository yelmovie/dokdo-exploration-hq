/* =========================================================================
   dexData.js — 도감 "독도 대백과" 카드 정의
   img: DOKDO 아이콘 별칭 또는 PHOTOS 별칭 (photo: true 면 실사)
   ========================================================================= */
import { DOKDO, PHOTOS } from "../config/assetManifest.js";

export const DEX_GROUPS = {
  record: { label: "기록", color: "#7048b6" },
  person: { label: "인물", color: "#14568f" },
  nature: { label: "자연", color: "#1d6b2e" },
  today:  { label: "오늘", color: "#b23a09" },
};

export const DEX_CARDS = [
  /* ---- 기록 (6p 연표·보너스) ---- */
  { id: "d-samguk", group: "record", title: "삼국사기",
    img: DOKDO.oldBook,
    desc: "512년 신라 장군 이사부가 우산국을 신라에 복속시킨 이야기가 전해지는 역사책이에요.",
    source: "외교부 독도: 우리 영토인 근거", how: "기록 보관소 연표 완성" },
  { id: "d-sejong", group: "record", title: "세종실록 지리지",
    img: DOKDO.sealedBook,
    desc: "1454년, 울릉도(무릉)와 독도(우산)가 강원도 울진현에 속한 두 섬으로 기록됐어요. “날씨가 맑으면 서로 바라볼 수 있다”는 설명도 있어요.",
    source: "외교부 독도: 우리 영토인 근거", how: "기록 보관소 연표 완성" },
  { id: "d-chikryeong", group: "record", title: "대한제국 칙령 제41호",
    img: DOKDO.decreeScroll,
    desc: "1900년 10월 25일 반포. 울도군 관할 구역에 석도(독도)를 포함해 관보에 실었어요. 이날이 ‘독도의 날’의 유래예요.",
    source: "외교부 독도: 우리 영토인 근거", how: "기록 보관소 연표 완성" },
  { id: "d-dohae", group: "record", title: "도해금지령",
    img: DOKDO.dohaeBan,
    desc: "1696년 일본 막부가 일본 어민의 울릉도 방향 뱃길을 금지한 명령. 일본 스스로 조선 땅임을 인정한 근거예요.",
    source: "외교부 독도: 우리 영토인 근거", how: "기록 보관소 보너스 문제" },

  /* ---- 인물 ---- */
  { id: "d-isabu", group: "person", title: "이사부",
    img: DOKDO.isabuChar,
    desc: "신라의 장군. 512년 우산국을 신라 땅으로 만들었어요. 독도 역사의 첫 페이지를 연 인물이에요.",
    source: "삼국사기", how: "기록 카드 ‘삼국사기’ 읽기" },
  { id: "d-anyongbok", group: "person", title: "안용복",
    img: DOKDO.anyongbokChar,
    desc: "조선의 어부. 일본에 두 번 건너가 울릉도와 독도가 조선 땅임을 당당히 주장했어요. 그 뒤 일본은 도해금지령을 내렸어요.",
    source: "외교부 독도: 우리 영토인 근거", how: "기록 카드 ‘안용복과 도해금지령’ 읽기" },

  /* ---- 자연 ---- */
  { id: "d-gull", group: "nature", title: "괭이갈매기",
    img: DOKDO.gullBird,
    desc: "고양이 울음소리를 내는 갈매기. 독도는 괭이갈매기를 비롯해 약 160종의 새가 찾는 쉼터예요.",
    source: "외교부 독도: 자연환경", how: "생태 수호 작전 — 바다새 관찰" },
  { id: "d-tidepool", group: "nature", title: "조간대 생물",
    img: PHOTOS.tidepool, photo: true,
    desc: "바닷가 바위 웅덩이에는 전복·소라·홍합·성게가 살아요. 돌 하나에도 생명의 집이 있어요.",
    source: "사진: 외교부 독도", how: "생태 수호 작전 — 조간대 관찰" },
  { id: "d-plants", group: "nature", title: "해안 식물",
    img: PHOTOS.plants, photo: true,
    desc: "바위틈에 뿌리내린 식물 약 60종이 확인됐어요. 한번 훼손되면 되살아나기 어려워요.",
    source: "사진: 외교부 독도", how: "생태 수호 작전 — 식물 관찰" },
  { id: "d-gangchi", group: "nature", title: "독도 강치",
    img: DOKDO.gangchiReal,
    desc: "옛날 독도 바위에 가득 살던 바다사자예요. 일본의 남획으로 사라졌고, 2015년 독도에 기념비가 세워졌어요. 우리가 보호를 배워야 하는 까닭이에요.",
    source: "해양수산부 독도강치 기념비", how: "생태 수호 작전 — 강치 이야기" },
  { id: "d-caves", group: "nature", title: "삼형제굴바위",
    img: PHOTOS.caves, photo: true,
    desc: "세 개의 굴이 나란히 뚫린 독도의 명물 바위예요. 파도가 오랜 시간 깎아 만들었어요.",
    source: "사진: 외교부 독도", how: "바위섬 분석실 — 단서 4개 수집" },

  /* ---- 오늘의 독도 ---- */
  { id: "d-guard", group: "today", title: "독도경비대",
    img: DOKDO.dokdoGuard,
    desc: "지금 이 순간에도 독도를 지키는 경찰 경비대예요. 독도(동도)에는 경비대 숙소와 헬기장, 유인 등대가 있어요.",
    source: "외교부 독도: 주요시설물 현황", how: "생태 수호 작전 완료" },
  { id: "d-today", group: "today", title: "오늘의 독도",
    img: PHOTOS.boat, photo: true,
    desc: "지금 독도에는 등대가 빛나고, 독도경비대가 지키고, 주민이 살고 있어요. 매년 10월 25일은 ‘독도의 날’이에요.",
    source: "사진: 외교부 독도", how: "탐사 수료관 입장" },
];

export function dexCard(id) { return DEX_CARDS.find((c) => c.id === id); }
