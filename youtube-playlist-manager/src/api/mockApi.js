// 1. 가상 데이터베이스(DB) 생성
const mockDB = [
  {
    artist: "아이유",
    title: "밤편지",
    genre: "발라드",
    mood: "잔잔함",
    youtube: [
      { id: 'yt_iu_1', title: "아이유 - 밤편지", channel: "1theK", duration: "3:45", thumbnail: "🌙" },
      { id: 'yt_iu_2', title: "아이유 - 밤편지 (Live)", channel: "IU Official", duration: "4:12", thumbnail: "🎤" },
    ],
    recommendations: [
      { id: 'rec_iu_1', title: "아이유 - Love Poem", artist: "아이유", reason: "비슷한 감성의 대표곡", thumbnail: "💜" },
      { id: 'rec_iu_2', title: "아이유 - 무릎", artist: "아이유", reason: "잔잔한 분위기의 발라드", thumbnail: "🛏️" },
    ]
  },
  {
    artist: "방탄소년단",
    title: "Dynamite",
    genre: "디스코 팝",
    mood: "신남",
    youtube: [
      { id: 'yt_bts_1', title: "BTS (방탄소년단) 'Dynamite' Official MV", channel: "HYBE LABELS", duration: "3:43", thumbnail: "🧨" },
      { id: 'yt_bts_2', title: "BTS, 'Dynamite' [THE TONIGHT SHOW]", channel: "The Tonight Show", duration: "3:45", thumbnail: "🕺" },
    ],
    recommendations: [
      { id: 'rec_bts_1', title: "방탄소년단 - Butter", artist: "방탄소년단", reason: "비슷한 디스코 팝 장르", thumbnail: "🧈" },
      { id: 'rec_bts_2', title: "방탄소년단 - Permission to Dance", artist: "방탄소년단", reason: "긍정적인 에너지의 곡", thumbnail: "💃" },
    ]
  },
  {
    artist: "BLACKPINK",
    title: "How You Like That",
    genre: "힙합, EDM",
    mood: "강렬함",
    youtube: [
      { id: 'yt_bp_1', title: "BLACKPINK - 'How You Like That' M/V", channel: "BLACKPINK", duration: "3:03", thumbnail: "👑" },
      { id: 'yt_bp_2', title: "BLACKPINK - 'How You Like That' DANCE PERFORMANCE VIDEO", channel: "BLACKPINK", duration: "3:01", thumbnail: "💃" },
    ],
    recommendations: [
      { id: 'rec_bp_1', title: "BLACKPINK - DDU-DU DDU-DU", artist: "BLACKPINK", reason: "강렬한 비트의 대표곡", thumbnail: "🔫" },
      { id: 'rec_bp_2', title: "BLACKPINK - Kill This Love", artist: "BLACKPINK", reason: "비슷한 분위기의 히트곡", thumbnail: "💔" },
    ]
  }
];

// 2. DB에서 랜덤으로 곡 정보를 선택하도록 수정
const analyzeImageForText = (imageData) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() > 0.9) { // 10% 확률로 에러 발생
        reject(new Error("이미지 분석에 실패했습니다."));
      } else {
        const randomIndex = Math.floor(Math.random() * mockDB.length);
        const randomSong = mockDB[randomIndex];
        // 기본 정보만 반환
        resolve({
          artist: randomSong.artist,
          title: randomSong.title,
          genre: randomSong.genre,
          mood: randomSong.mood,
        });
      }
    }, 1000);
  });
};

// 3. 전달받은 정보(info)를 기반으로 DB에서 검색하도록 수정
const searchYouTubeMock = (info) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const songData = mockDB.find(song => song.artist === info.artist && song.title === info.title);
      const results = songData ? songData.youtube : [];
      // 고유 ID를 부여하여 React key 에러 방지
      const uniqueResults = results.map((video, index) => ({
        ...video,
        id: `${video.id}_${Date.now()}_${index}`
      }));
      resolve(uniqueResults);
    }, 1000);
  });
};

// 4. 전달받은 정보(info)를 기반으로 DB에서 추천곡을 검색하도록 수정
const generateRecommendations = (info) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const songData = mockDB.find(song => song.artist === info.artist && song.title === info.title);
      const recommendations = songData ? songData.recommendations : [];
      resolve(recommendations);
    }, 500);
  });
};

// (이 부분은 변경할 필요 없음)
export const fetchYouTubeDataFromImage = async (imageData) => {
  const songInfo = await analyzeImageForText(imageData);
  const [videos, recommendations] = await Promise.all([
    searchYouTubeMock(songInfo),
    generateRecommendations(songInfo),
  ]);
  return { videos, recommendations };
};