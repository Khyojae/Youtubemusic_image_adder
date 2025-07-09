export const fetchYouTubeDataFromImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);
  const backendUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/process-image`;
  const response = await fetch(backendUrl, { method: 'POST', credentials: 'include', body: formData });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || '서버로부터 데이터를 가져오는 데 실패했습니다.');
  }
  return response.json();
};

export const fetchHistory = async () => {
  const backendUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/history`;
  const response = await fetch(backendUrl, { credentials: 'include' });
  if (!response.ok) {
    throw new Error('히스토리 데이터를 불러오는 데 실패했습니다.');
  }
  return response.json();
};

export const deleteHistory = async (id) => {
    const backendUrl = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/history/${id}`;
    const response = await fetch(backendUrl, { method: 'DELETE', credentials: 'include' });
    if (!response.ok) {
      throw new Error('히스토리 삭제에 실패했습니다.');
    }
    return response.json();
};