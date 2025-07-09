require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { ImageAnnotatorClient } = require('@google-cloud/vision');
const { google } = require('googleapis');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const cookieParser = require('cookie-parser');

const app = express();
const port = 3001;

// --- DB 및 모델 정의 ---
const UserSchema = new mongoose.Schema({
  googleId: String,
  displayName: String,
  accessToken: String,
  refreshToken: String
});
const User = mongoose.model('User', UserSchema);

const HistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  originalQuery: String,
  foundSongs: [{ videoId: String, videoTitle: String }],
  createdAt: { type: Date, default: Date.now }
});
const History = mongoose.model('History', HistorySchema);

// --- Passport 및 세션 설정 ---
app.use(session({ secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: true, cookie: { secure: false } }));
app.use(cookieParser());
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3001/auth/google/callback",
    scope: ['profile', 'https://www.googleapis.com/auth/youtube']
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
        let user = await User.findOne({ googleId: profile.id });
        if (user) {
            user.accessToken = accessToken;
            user.refreshToken = refreshToken || user.refreshToken;
            await user.save();
            done(null, user);
        } else {
            const newUser = new User({
                googleId: profile.id,
                displayName: profile.displayName,
                accessToken: accessToken,
                refreshToken: refreshToken,
            });
            await newUser.save();
            done(null, newUser);
        }
    } catch (err) {
        done(err, null);
    }
  }
));

// --- 미들웨어 설정 ---
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- Google API 클라이언트 설정 ---
const keyFilePath = path.join(__dirname, 'fair-portal-463908-m9-b59e0ac3b2ae.json');
const visionClient = new ImageAnnotatorClient({ keyFilename: keyFilePath });
const auth = new google.auth.GoogleAuth({ keyFile: keyFilePath, scopes: ['https://www.googleapis.com/auth/youtube.force-ssl']});
google.options({ auth: auth });
const youtube = google.youtube('v3');

// --- 인증 API 엔드포인트 ---
app.get('/auth/google', passport.authenticate('google', { accessType: 'offline', prompt: 'consent' }));
app.get('/auth/google/callback', passport.authenticate('google', { failureRedirect: 'http://localhost:3000' }), (req, res) => {
    res.redirect('http://localhost:3000');
});
app.get('/auth/me', (req, res) => {
    if (req.user) {
        res.json({ loggedIn: true, user: { displayName: req.user.displayName, id: req.user._id } });
    } else {
        res.json({ loggedIn: false });
    }
});
app.post('/auth/logout', (req, res, next) => {
    req.logout(err => {
        if (err) { return next(err); }
        req.session.destroy();
        res.clearCookie('connect.sid');
        res.status(200).json({ message: '로그아웃 성공' });
    });
});

// --- 핵심 기능 API 엔드포인트들 ---
app.post('/api/process-image', upload.single('image'), async (req, res) => {
    if (!req.file) { return res.status(400).json({ error: '이미지 파일이 필요합니다.' }); }
    let uniqueSongTitles = [];
    let videos = [];
    try {
        const [result] = await visionClient.textDetection(req.file.buffer);
        if (result.textAnnotations && result.textAnnotations.length > 0) {
            const ocrText = result.textAnnotations[0].description;
            const lines = ocrText.split('\n');
            let currentTitle = '';
            const songTitles = [];
            for (const line of lines) {
                let cleanedLine = line.replace(/\b\d{1,2}:\d{2}(:\d{2})?\b/g, '').trim();
                if (cleanedLine.includes(' - ') && currentTitle) {
                    songTitles.push(currentTitle.trim());
                    currentTitle = cleanedLine;
                } else { currentTitle += ' ' + cleanedLine; }
            }
            if (currentTitle) { songTitles.push(currentTitle.trim()); }
            const finalSongTitles = songTitles.map(t => t.replace(/[^가-힣a-zA-Z0-9\s-()]/g, '').replace(/\s+/g, ' ').trim()).filter(t => t.length > 3 && !/^\d+$/.test(t));
            uniqueSongTitles = [...new Set(finalSongTitles)];
            
            const searchPromises = uniqueSongTitles.map(async (title) => {
                try {
                    const response = await youtube.search.list({ part: 'snippet', q: `${title} Official Audio`, type: 'video', maxResults: 1 });
                    return response.data.items[0];
                } catch (e) { return null; }
            });
            const searchResults = (await Promise.all(searchPromises)).filter(item => item);
            const videoIds = searchResults.map(item => item.id.videoId).join(',');
            if (videoIds) {
                const videoDetailsResponse = await youtube.videos.list({ part: 'snippet,status', id: videoIds });
                videos = videoDetailsResponse.data.items
                    .filter(item => item.status.uploadStatus === 'processed')
                    .map(item => ({ id: item.id, title: item.snippet.title, thumbnail: item.snippet.thumbnails.default.url, channel: item.snippet.channelTitle }));
            }
        }
        if (req.user && uniqueSongTitles.length > 0) {
            const newHistory = new History({
                userId: req.user._id,
                originalQuery: uniqueSongTitles.join(', ') || "분석된 노래 없음",
                foundSongs: videos.map(v => ({ videoId: v.id, videoTitle: v.title }))
            });
            await newHistory.save();
            console.log(`'${req.user.displayName}' 님의 새 분석 히스토리가 DB에 저장되었습니다.`);
        }
        res.json({ videos: videos });
    } catch (error) {
        console.error('API 처리 중 에러 발생:', error);
        res.status(500).json({ error: '서버에서 오류가 발생했습니다.' });
    }
});

app.get('/api/history', async (req, res) => {
    if (!req.user) { return res.status(401).json([]); }
    try {
        const histories = await History.find({ userId: req.user._id }).sort({ createdAt: -1 }).limit(10);
        res.json(histories);
    } catch (error) { res.status(500).json({ error: '히스토리 조회 중 오류가 발생했습니다.' }); }
});

app.delete('/api/history/:id', async (req, res) => {
    if (!req.user) { return res.status(401).json({ error: '로그인이 필요합니다.' }); }
    try {
        const { id } = req.params;
        const result = await History.findOneAndDelete({ _id: id, userId: req.user._id });
        if (!result) { return res.status(404).json({ message: '해당 히스토리를 찾을 수 없거나 권한이 없습니다.' }); }
        res.status(200).json({ message: '히스토리가 성공적으로 삭제되었습니다.' });
    } catch (error) { res.status(500).json({ error: '히스토리 삭제 중 오류가 발생했습니다.' }); }
});

app.post('/api/youtube/create-playlist', async (req, res) => {
    if (!req.user) { return res.status(401).json({ error: '로그인이 필요합니다.' }); }
    const { title, videoIds } = req.body;
    if (!title || !videoIds || videoIds.length === 0) { return res.status(400).json({ error: '제목과 영상 ID가 필요합니다.' }); }
    try {
        const oauth2Client = new google.auth.OAuth2();
        oauth2Client.setCredentials({ access_token: req.user.accessToken });
        const youtube = google.youtube({ version: 'v3', auth: oauth2Client });
        const playlistResponse = await youtube.playlists.insert({
            part: 'snippet,status',
            resource: { snippet: { title: title, description: 'Generated by Playlist Image Scanner' }, status: { privacyStatus: 'private' } }
        });
        const playlistId = playlistResponse.data.id;
        for (const videoId of videoIds) {
            await youtube.playlistItems.insert({ part: 'snippet', resource: { snippet: { playlistId: playlistId, resourceId: { kind: 'youtube#video', videoId: videoId } } } });
        }
        res.json({ message: '플레이리스트가 성공적으로 생성되었습니다!', playlistUrl: `https://music.youtube.com/watch?v=VIDEO_ID0{playlistId}` });
    } catch (error) {
        console.error("플레이리스트 생성 오류:", error.message);
        res.status(500).json({ error: '플레이리스트 생성 중 오류 발생' });
    }
});

// --- 서버 시작 로직 ---
const startServer = async () => {
    try {
        await mongoose.connect(process.env.DATABASE_URL, {
            serverSelectionTimeoutMS: 30000,
            socketTimeoutMS: 45000,
        });
        console.log('데이터베이스에 성공적으로 연결되었습니다.');
        app.listen(port, () => {
            console.log(`서버가 http://localhost:${port} 에서 실행 중입니다.`);
        });
    } catch (error) {
        console.error('데이터베이스 연결 실패:', error);
        process.exit(1);
    }
};

startServer();