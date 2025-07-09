// src/hooks/usePlaylists.js 파일의 전체 내용입니다.

import { useState } from 'react';

const initialPlaylists = [
  { id: 1, name: '내가 좋아하는 음악', videos: [] },
  { id: 2, name: '운동할 때 듣는 노래', videos: [] },
];

export function usePlaylists() {
  const [myPlaylists, setMyPlaylists] = useState(initialPlaylists);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const createNewPlaylist = () => {
    if (newPlaylistName.trim()) {
      const newPlaylist = { id: Date.now(), name: newPlaylistName, videos: [] };
      setMyPlaylists(prev => [...prev, newPlaylist]);
      setNewPlaylistName('');
    }
  };

  const addToPlaylist = (playlistId, videos) => {
    setMyPlaylists(prev => prev.map(playlist =>
      playlist.id === playlistId
        ? { ...playlist, videos: [...playlist.videos, ...videos.filter(v => !playlist.videos.some(pv => pv.id === v.id))] }
        : playlist
    ));
  };

  const removeFromPlaylist = (playlistId, videoId) => {
    setMyPlaylists(prev => prev.map(playlist =>
      playlist.id === playlistId
        ? { ...playlist, videos: playlist.videos.filter(v => v.id !== videoId) }
        : playlist
    ));
  };

  // [핵심] 이름 변경 함수 추가
  const renamePlaylist = (playlistId, newName) => {
    setMyPlaylists(prev => prev.map(playlist =>
      playlist.id === playlistId
        ? { ...playlist, name: newName }
        : playlist
    ));
  };

  return { myPlaylists, newPlaylistName, setNewPlaylistName, createNewPlaylist, addToPlaylist, removeFromPlaylist, renamePlaylist };
}