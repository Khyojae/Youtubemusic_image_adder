// src/api/youtubeApi.js 파일을 이렇게 수정해보세요.

export const fetchYouTubeDataFromImage = async (imageFile) => {
  // ▼▼▼ 이 줄을 추가해서 imageFile 변수에 무엇이 들어있는지 확인! ▼▼▼
  console.log("fetchYouTubeDataFromImage가 받은 파일:", imageFile);

  const formData = new FormData();
  formData.append('image', imageFile);

  // 백엔드 서버의 API 엔드포인트 주소
  const backendUrl = 'http://localhost:3001/api/process-image';

  const response = await fetch(backendUrl, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '서버로부터 데이터를 가져오는 데 실패했습니다.');
  }

  return response.json();
};