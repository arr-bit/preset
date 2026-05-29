/**
 * ARR Official — Preset Hub Server
 * Node.js + Express backend
 * 
 * Cara pakai:
 *   npm install express multer cors
 *   node server.js
 * 
 * Atau pakai pm2 biar jalan terus:
 *   npm install -g pm2
 *   pm2 start server.js --name arr-preset
 */

const express  = require('express');
const multer   = require('multer');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const crypto   = require('crypto');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── FOLDER SETUP ──────────────────────────────────────────────────────────────
const DATA_DIR    = path.join(__dirname, 'data');
const VIDEOS_DIR  = path.join(DATA_DIR, 'videos');
const DB_FILE     = path.join(DATA_DIR, 'presets.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

// Buat folder kalau belum ada
[DATA_DIR, VIDEOS_DIR].forEach(d => { if(!fs.existsSync(d)) fs.mkdirSync(d, {recursive:true}); });

// ── DB HELPERS ────────────────────────────────────────────────────────────────
function readDB(){
  try { return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); }
  catch { return []; }
}
function writeDB(data){
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// ── CONFIG (passkey) ──────────────────────────────────────────────────────────
function readConfig(){
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE,'utf8')); }
  catch { return { passkey: hashPass('arr121285') }; }
}
function writeConfig(cfg){
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}
function hashPass(p){
  return crypto.createHash('sha256').update(p+'arr_salt_2025').digest('hex');
}
function checkPass(input){
  const cfg = readConfig();
  return hashPass(input) === cfg.passkey;
}

// Init config file kalau belum ada
if(!fs.existsSync(CONFIG_FILE)) writeConfig(readConfig());

// ── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.static(__dirname));           // serve index.html, config.js
app.use('/data/videos', express.static(VIDEOS_DIR)); // serve uploaded videos

// ── MULTER (video upload) ─────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, VIDEOS_DIR),
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname) || '.mp4';
    const name = 'vid_' + Date.now() + '_' + Math.random().toString(36).slice(2,6) + ext;
    cb(null, name);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // max 100MB per video
  fileFilter: (req, file, cb) => {
    if(file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Hanya file video yang diizinkan'));
  }
});

// ── API ROUTES ────────────────────────────────────────────────────────────────

/**
 * GET /api/presets
 * Ambil semua preset
 */
app.get('/api/presets', (req, res) => {
  res.json({ ok: true, data: readDB() });
});

/**
 * POST /api/auth
 * Verifikasi passkey
 * Body: { passkey: "..." }
 */
app.post('/api/auth', (req, res) => {
  const { passkey } = req.body;
  if(!passkey) return res.json({ ok: false, msg: 'Passkey kosong' });
  if(checkPass(passkey)) res.json({ ok: true });
  else res.json({ ok: false, msg: 'Passkey salah' });
});

/**
 * POST /api/change-pass
 * Ganti passkey
 * Body: { oldPass: "...", newPass: "..." }
 */
app.post('/api/change-pass', (req, res) => {
  const { oldPass, newPass } = req.body;
  if(!checkPass(oldPass)) return res.json({ ok: false, msg: 'Passkey lama salah!' });
  if(!newPass || newPass.length < 4) return res.json({ ok: false, msg: 'Passkey baru minimal 4 karakter!' });
  writeConfig({ passkey: hashPass(newPass) });
  res.json({ ok: true, msg: 'Passkey berhasil diganti!' });
});

/**
 * POST /api/upload
 * Upload preset baru
 * Form-data: passkey, title, link, by, video (file, opsional)
 */
app.post('/api/upload', upload.single('video'), (req, res) => {
  const { passkey, title, link, by } = req.body;

  // Validasi passkey
  if(!checkPass(passkey)){
    // Hapus file yang terlanjur diupload
    if(req.file) fs.unlink(req.file.path, ()=>{});
    return res.json({ ok: false, msg: 'Passkey salah' });
  }

  // Validasi field wajib
  if(!title || !link || !by){
    if(req.file) fs.unlink(req.file.path, ()=>{});
    return res.json({ ok: false, msg: 'Judul, link, dan nama wajib diisi!' });
  }

  // Buat entry preset
  const preset = {
    id    : 'p_' + Date.now() + '_' + Math.random().toString(36).slice(2,6),
    title : title.trim(),
    link  : link.trim(),
    by    : by.trim(),
    vid   : req.file ? '/data/videos/' + req.file.filename : null,
    at    : new Date().toISOString()
  };

  const all = readDB();
  all.unshift(preset);
  writeDB(all);

  res.json({ ok: true, msg: `"${preset.title}" berhasil diupload!`, data: preset });
});

/**
 * DELETE /api/preset/:id
 * Hapus preset
 * Body: { passkey: "..." }
 */
app.delete('/api/preset/:id', (req, res) => {
  const { passkey } = req.body;
  if(!checkPass(passkey)) return res.json({ ok: false, msg: 'Passkey salah' });

  const all     = readDB();
  const target  = all.find(p => p.id === req.params.id);
  if(!target) return res.json({ ok: false, msg: 'Preset tidak ditemukan' });

  // Hapus file video kalau ada
  if(target.vid){
    const filePath = path.join(__dirname, target.vid);
    if(fs.existsSync(filePath)) fs.unlink(filePath, ()=>{});
  }

  writeDB(all.filter(p => p.id !== req.params.id));
  res.json({ ok: true, msg: 'Preset dihapus.' });
});

// ── ERROR HANDLER ─────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.message);
  res.status(500).json({ ok: false, msg: err.message || 'Server error' });
});

// ── START ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   ARR Official — Preset Hub Server   ║
║   Running at http://localhost:${PORT}   ║
╚══════════════════════════════════════╝

  Data folder : ./data/
  Presets DB  : ./data/presets.json
  Videos      : ./data/videos/
  Config      : ./data/config.json
  
  Default passkey: arr121285
  (Ganti via UI → Upload → Ganti Passkey)
  `);
});
