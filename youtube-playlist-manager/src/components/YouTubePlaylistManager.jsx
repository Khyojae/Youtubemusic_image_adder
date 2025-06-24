import React, { useState } from 'react';
import axios from 'axios'; // axios가 설치 안됐다면 npm install axios 실행

function YouTubePlaylistManager() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoResults, setVideoResults] = useState([]); // 유튜브 검색 결과를 저장할 상태
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
    setVideoResults([]); // 새 파일 선택 시 이전 결과 초기화
    setError('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedFile) {
      setError('이미지를 먼저 선택해주세요.');
      return;
    }

    const formData = new FormData();
    formData.append('image', selectedFile);

    setIsLoading(true);
    setError('');

    try {
      // 서버의 /api/process-image 엔드포인트로 요청
      const response = await axios.post('http://localhost:3001/api/process-image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // 서버로부터 받은 비디오 목록을 상태에 저장
      console.log('서버로부터 받은 데이터:', response.data); // 브라우저 콘솔에서 데이터 확인
      setVideoResults(response.data.videos);

    } catch (err) {
      setError('결과를 가져오는 중 오류가 발생했습니다.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  // 화면에 보여질 JSX 부분
  return (
    <div>
      <h1>유튜브 영상 찾기 (이미지 업로드)</h1>
      <form onSubmit={handleSubmit}>
        <input type="file" accept="image/*" onChange={handleFileChange} />
        <button type="submit" disabled={isLoading}>
          {isLoading ? '처리 중...' : '검색하기'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {/* 저장된 비디오 목록을 화면에 표시 */}
      <div className="results-container">
        {videoResults.length > 0 && <h2>검색 결과</h2>}
        <ul>
          {videoResults.map(video => (
            <li key={video.id}>
              {/* 유튜브 링크 생성 */}
              <a href={`https://www.youtube.com/watch?v=$${video.id}`} target="_blank" rel="noopener noreferrer">
                <img src={video.thumbnail} alt={video.title} />
                <p>{video.title}</p>
                <span>{video.channel}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default YouTubePlaylistManager;