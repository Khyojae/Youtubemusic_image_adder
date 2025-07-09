import React, { useState, useEffect, useRef } from 'react';
import { useYouTubeData } from '../hooks/useYouTubeData';
import { usePlaylists } from '../hooks/usePlaylists';
import { fetchHistory, deleteHistory } from '../api/youtubeApi';

// --- 작은 컴포넌트들 ---
const Spinner = () => ( <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> );

const SongItem = ({ video, playlists, onAddToPlaylist }) => {
  const [showPlaylists, setShowPlaylists] = useState(false);
  const handleAddClick = (playlistId) => {
    onAddToPlaylist(playlistId, [video]);
    setShowPlaylists(false);
  };
  return (
    <li className="flex justify-between items-center p-2 rounded-md hover:bg-slate-50">
      <div className="flex items-center overflow-hidden">
        <img src={video.thumbnail} alt={video.title} className="w-12 h-12 object-cover rounded-md mr-3 shadow-sm flex-shrink-0" />
        <span className="text-slate-700 truncate">{video.title}</span>
      </div>
      <div className="relative ml-2">
        <button onClick={() => setShowPlaylists(!showPlaylists)} className="bg-sky-500 text-white rounded-full w-7 h-7 flex items-center justify-center hover:bg-sky-600 transition text-lg font-bold flex-shrink-0" title="플레이리스트에 추가">+</button>
        {showPlaylists && (
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border"><div className="py-1 text-sm text-gray-700">
              {playlists.length > 0 ? ( playlists.map(pl => ( <div key={pl.id} onClick={() => handleAddClick(pl.id)} className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-left">{pl.name}</div> )))
              : ( <div className="px-4 py-2 text-gray-500">플레이리스트 없음</div> )}
          </div></div>
        )}
      </div>
    </li>
  );
};

const MyPlaylistItem = ({ playlist, onRename, onUpload, onRemoveVideo, isLoggedIn }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(playlist.name);
  const handleRename = () => {
    if (name.trim() && name !== playlist.name) { onRename(playlist.id, name.trim()); }
    setIsEditing(false);
  };
  return (
    <div className="p-4 border border-slate-200 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-3">
        {isEditing ? (
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} onBlur={handleRename} onKeyDown={(e) => e.key === 'Enter' && handleRename()} className="font-bold text-xl text-slate-800 border-b-2 border-sky-500 focus:outline-none" autoFocus />
        ) : ( <h3 onDoubleClick={() => setIsEditing(true)} className="font-bold text-xl text-slate-800 cursor-pointer" title="더블클릭하여 이름 수정">{playlist.name}</h3> )}
        <div>
          <button onClick={() => setIsEditing(!isEditing)} className="text-sm text-slate-500 hover:text-sky-600 mr-2">이름 변경</button>
          {isLoggedIn && ( <button onClick={() => onUpload(playlist)} className="bg-red-500 text-white text-xs font-bold py-1 px-3 rounded-full hover:bg-red-600 transition">유튜브에 올리기</button> )}
        </div>
      </div>
      {playlist.videos.length > 0 ? ( <ul className="space-y-2">{playlist.videos.map(v => ( <li key={v.id} className="flex justify-between items-center p-2 rounded-md hover:bg-slate-100"><span className="text-slate-700">{v.title}</span><button onClick={() => onRemoveVideo(playlist.id, v.id)} className="text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button></li> ))}</ul> )
      : <p className="text-slate-500 text-sm italic">이 플레이리스트는 비어있습니다.</p>}
    </div>
  );
};

// --- 메인 컴포넌트 ---
export default function YouTubePlaylistManager() {
  const { status, extractedVideos, error, processImage } = useYouTubeData();
  const { myPlaylists, newPlaylistName, setNewPlaylistName, createNewPlaylist, addToPlaylist, removeFromPlaylist, renamePlaylist } = usePlaylists();
  const fileInputRef = useRef(null);
  const [histories, setHistories] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const dropRef = useRef(null);

  useEffect(() => {
    fetch('http://localhost:3001/auth/me', {credentials: 'include'})
      .then(res => res.json()).then(data => {
        if (data.loggedIn) { setIsLoggedIn(true); setUser(data.user); }
      });
    loadHistory();
  }, []);

  const loadHistory = () => {
    fetchHistory().then(data => setHistories(data)).catch(err => console.error("히스토리 로딩 실패:", err));
  };

  const triggerAnalysis = (file) => {
    if (file && file.type.startsWith('image/')) { processImage(file).then(() => { loadHistory(); });}
  };
  const handleFileSelect = (event) => { triggerAnalysis(event.target.files?.[0]); };

  // [핵심] 히스토리 전체를 유튜브 플레이리스트로 열기 함수
  const openPlaylistFromHistory = (historyItem) => {
    if (!historyItem.foundSongs || historyItem.foundSongs.length === 0) {
      alert("재생할 노래가 없습니다.");
      return;
    }
    const videoIdString = historyItem.foundSongs.map(song => song.videoId).join(',');
    const playlistUrl = `http://www.youtube.com/watch_videos?video_ids=${videoIdString}`;
    window.open(playlistUrl, '_blank');
  };

  const handleDeleteHistory = (idToDelete) => {
    if (window.confirm("이 분석 기록을 정말 삭제하시겠습니까?")) {
      deleteHistory(idToDelete).then(() => { setHistories(prevHistories => prevHistories.filter(h => h._id !== idToDelete)); }).catch(err => { alert("기록 삭제에 실패했습니다."); });
    }
  };
  const handleUploadToYouTube = async (playlist) => {
    if (!isLoggedIn) { alert("유튜브에 업로드하려면 먼저 Google로 로그인해야 합니다."); return; }
    const videoIds = playlist.videos.map(v => v.id);
    if (videoIds.length === 0) { alert("플레이리스트에 노래가 없습니다."); return; }
    if (!window.confirm(`'${playlist.name}' 플레이리스트를 유튜브에 비공개로 생성하시겠습니까?`)) { return; }
    try {
        const response = await fetch('http://localhost:3001/api/youtube/create-playlist', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ title: playlist.name, videoIds: videoIds })
        });
        const result = await response.json();
        if(response.ok) {
            alert(`'${playlist.name}' 플레이리스트가 유튜브에 성공적으로 생성되었습니다!`);
            if (result.playlistUrl) { window.open(result.playlistUrl, '_blank'); }
        } else { throw new Error(result.error); }
    } catch(err) { alert(`업로드 실패: ${err.message}`); }
  };
  const handleDrag = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDragIn = (e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.items && e.dataTransfer.items.length > 0) { setIsDragging(true); } };
  const handleDragOut = (e) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation(); setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      triggerAnalysis(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <header className="text-center mb-6">
          <div className="flex justify-end items-center p-2">
            {isLoggedIn ? (
                <div className="flex items-center">
                    <span className="text-slate-600 mr-4">환영합니다, {user?.displayName}님!</span>
                    <a href="http://localhost:3001/auth/logout" className="bg-slate-200 text-slate-700 font-semibold py-2 px-4 rounded-lg hover:bg-slate-300 transition">로그아웃</a>
                </div>
            ) : ( <a href="http://localhost:3001/auth/google" className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 transition">Google로 로그인</a> )}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-violet-500">YouTube Playlist Manager</h1>
          <p className="mt-4 text-lg text-slate-600">이미지로 노래를 찾아 플레이리스트에 추가하세요.</p>
        </header>

        <div onDrop={handleDrop} onDragEnter={handleDragIn} onDragLeave={handleDragOut} onDragOver={handleDrag} className={`relative bg-white p-8 rounded-2xl shadow-lg mb-10 text-center border-4 border-dashed transition-all duration-300 ${isDragging ? 'border-sky-400 bg-sky-50' : 'border-slate-300'}`}>
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />
          <div className="flex flex-col items-center justify-center">
            <p className="text-slate-500 mb-4">여기에 이미지를 드롭하거나, 버튼을 클릭하여 선택하세요.</p>
            <button onClick={() => fileInputRef.current.click()} disabled={status === 'loading'} className="inline-flex items-center justify-center bg-sky-600 text-white font-bold text-lg py-3 px-8 rounded-full hover:bg-sky-700 focus:outline-none focus:ring-4 focus:ring-sky-300 transition-transform duration-200 ease-in-out hover:scale-105 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:scale-100">
              {status === 'loading' ? <><Spinner /> 처리 중...</> : <><span className="mr-2 text-xl">📸</span> 이미지 선택하기</>}
            </button>
          </div>
        </div>
        
        {status === 'error' && ( <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow mb-8" role="alert"><p className="font-bold">오류 발생</p><p>{error}</p></div> )}
        
        {status === 'success' && extractedVideos.length > 0 && (
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg mb-10 animate-fade-in">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">🔍 분석 결과</h2>
            <ul className="space-y-2">
              {extractedVideos.map(video => ( <SongItem key={video.id} video={video} playlists={myPlaylists} onAddToPlaylist={addToPlaylist} /> ))}
            </ul>
          </div>
        )}
        
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg mb-10">
           <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">📜 최근 분석 기록 (클릭하여 전체 재생)</h2>
           {histories.length > 0 ? (
            <ul className="space-y-4">
              {histories.map(history => (
                <li
                  key={history._id}
                  onClick={() => openPlaylistFromHistory(history)}
                  className="flex justify-between items-center p-4 border rounded-lg bg-slate-50 hover:bg-sky-100 hover:border-sky-300 transition cursor-pointer"
                >
                  <div>
                    <p className="text-sm text-slate-500 mb-2">{new Date(history.createdAt).toLocaleString()} 에 분석됨</p>
                    <p className="font-semibold text-slate-700 truncate" title={history.originalQuery}>{history.originalQuery}</p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // 이벤트 버블링 방지
                      handleDeleteHistory(history._id);
                    }}
                    className="ml-4 text-red-400 hover:text-red-600 font-bold text-2xl flex-shrink-0"
                    title="기록 삭제"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
           ) : <p className="text-center text-slate-500 py-4">아직 분석 기록이 없습니다.</p>}
        </div>

        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg">
           <h2 className="text-3xl font-bold text-gray-800 mb-6 border-b pb-4">🎵 내 플레이리스트</h2>
           <div className="flex gap-2 mb-8">
            <input type="text" value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} placeholder="새 플레이리스트 이름" className="flex-grow border-2 border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"/>
            <button onClick={createNewPlaylist} className="bg-blue-500 text-white font-semibold py-2 px-5 rounded-lg hover:bg-blue-600 transition shadow-sm">생성</button>
           </div>
           <div className="space-y-6">
            {myPlaylists.map(pl => ( <MyPlaylistItem key={pl.id} playlist={pl} onRename={renamePlaylist} onUpload={handleUploadToYouTube} onRemoveVideo={removeFromPlaylist} isLoggedIn={isLoggedIn} /> ))}
           </div>
        </div>
      </div>
    </div>
  );
}