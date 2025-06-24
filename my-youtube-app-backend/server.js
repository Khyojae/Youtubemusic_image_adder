require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { google } = require('googleapis');
const cors = require('cors');

const app = express();
const port = 3001; // 서버 포트

// CORS 설정: 리액트 앱 주소 허용
app.use(cors({ origin: 'http://localhost:3000' }));

// Google API 클라이언트 설정
const visionClient = new ImageAnnotatorClient();
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.GOOGLE_API_KEY // .env 파일에 GOOGLE_API_KEY가 설정되어 있어야 합니다.
});

// Multer 설정 (이미지를 메모리에 저장)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// API 엔드포인트 생성
app.post('/api/process-image', upload.single('image'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '이미지 파일이 필요합니다.' });
  }

  try {
    // 1. Cloud Vision API로 이미지에서 텍스트 추출
    const [result] = await visionClient.textDetection(req.file.buffer);
    const detections = result.textAnnotations;
    
    if (!detections || detections.length === 0) {
      return res.status(400).json({ error: '이미지에서 텍스트를 찾을 수 없습니다.' });
    }

    const ocrText = detections[0].description;
    console.log('OCR 원본 텍스트:', ocrText);

    // 2. 검색 정확도를 높이기 위한 텍스트 정제 작업
    let finalText = ocrText;

  
    // 2-1. 괄호와 괄호 안의 내용 제거 (Feat. 등 부가 정보 제거)
    finalText = finalText.replace(/\(.*?\)/g, '');
    finalText = finalText.replace(/\[.*?\]/g, '');

    // 2-2. 특수문자 제거 (한글, 영어, 숫자, 하이픈(-), 공백만 남김)
    finalText = finalText.replace(/[^a-zA-Z0-9가-힣\s-]/g, '');

    // 2-3. 검색에 방해되는 일반적인 단어 제거 (목록 강화)
    const noiseWords = [
        'MUSIC', 'LYRICS', 'MV', 'Official', 'Audio', 'USIC', 'II', 'Vancouver', 
        'EVERYWHERE', 'EVERYWH', 'WHERE' // <-- 불필요한 단어 추가
    ];
    noiseWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      finalText = finalText.replace(regex, '');
    });

    // 2-4. 시간 및 독립된 모든 숫자 제거 (로직 강화)
    finalText = finalText.replace(/\b\d{1,2}:\d{2}\b/g, ''); // 0:01, 12:34 같은 패턴
    finalText = finalText.replace(/\b\d+\b/g, '');     // '001' 같이 독립된 모든 숫자 제거

    // 2-5. 여러 공백을 하나로 정리
    finalText = finalText.replace(/\s+/g, ' ').trim();

    console.log('최종 정제된 검색어:', finalText);
    
    // 3. YouTube Data API로 동영상 검색
    const searchResponse = await youtube.search.list({
      part: 'snippet',
      q: finalText, // 최종 정제된 검색어 사용
      type: 'video',
      maxResults: 5,
    });

    // 디버깅용: 유튜브에서 받은 실제 데이터 확인
    console.log('유튜브 API 실제 응답 (items 개수):', searchResponse.data.items.length);

    // 4. 프론트엔드에 보낼 데이터 형식으로 가공
    const videos = searchResponse.data.items.map(item => ({
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.default.url,
      channel: item.snippet.channelTitle,
    }));
    
    // (선택) 첫 번째 검색 결과를 기반으로 관련 영상 추천
    // 현재는 간단하게 다음 영상들을 추천으로 가정합니다.
    const recommendations = videos.slice(1, 3); 

    // 5. 최종 결과를 프론트엔드로 전송
    res.json({ videos, recommendations });

  } catch (error) {
    console.error('API 처리 중 에러 발생:', error);
    res.status(500).json({ error: '서버에서 오류가 발생했습니다.' });
  }
});

app.listen(port, () => {
  console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
});