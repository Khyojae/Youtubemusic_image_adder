import { useState } from 'react';

const initialPlaylists = [
  { id: 1, name: '내가 좋아하는 음악', videos: [] },
  { id: 2, name: '운동할 때 듣는 노래', videos: [] },
  { id: 3, name: '공부용 플레이리스트', videos: [] },
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
    setMyPlaylists(prev => prev.map(pl =>
      pl.id === playlistId
        ? { ...pl, videos: [...pl.videos, ...videos.filter(v => !pl.videos.some(pv => pv.id === v.id))] } // 중복 추가 방지
        : pl
    ));
  };

  const removeFromPlaylist = (playlistId, videoId) => {
    setMyPlaylists(prev => prev.map(pl =>
      pl.id === playlistId
        ? { ...pl, videos: pl.videos.filter(v => v.id !== videoId) }
        : pl
    ));
  };

  return {
    myPlaylists,
    newPlaylistName,
    setNewPlaylistName,
    createNewPlaylist,
    addToPlaylist,
    removeFromPlaylist,
  };
}