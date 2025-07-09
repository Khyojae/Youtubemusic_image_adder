// src/hooks/useYouTubeData.js

import { useReducer } from 'react';
import { fetchYouTubeDataFromImage } from '../api/youtubeApi';

const initialState = {
  status: 'idle',
  extractedVideos: [],
  recommendedSongs: [],
  error: null,
};

function reducer(state, action) {
  switch (action.type) {
    case 'FETCH_START':
      return { ...initialState, status: 'loading' };
    case 'FETCH_SUCCESS':
      return {
        ...state,
        status: 'success',
        extractedVideos: action.payload.videos || [],
        recommendedSongs: action.payload.recommendations || [],
      };
    case 'FETCH_ERROR':
      return { ...state, status: 'error', error: action.payload };
    case 'RESET':
      return { ...initialState };
    default:
      throw new Error('Unhandled action type');
  }
}

export function useYouTubeData() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const processImage = async (imageFile) => {
    dispatch({ type: 'FETCH_START' });
    try {
      const data = await fetchYouTubeDataFromImage(imageFile);
      dispatch({ type: 'FETCH_SUCCESS', payload: data });
    } catch (e) {
      dispatch({ type: 'FETCH_ERROR', payload: e.message });
    }
  };

  const resetData = () => { dispatch({ type: 'RESET' }); };
  return { ...state, processImage, resetData };
}