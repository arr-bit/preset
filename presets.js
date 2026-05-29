// api/presets.js
// GET  /api/presets        → ambil semua preset
// POST /api/presets        → upload preset baru (butuh passkey)

import crypto from 'crypto';

// ── ENV VARS (set di Vercel Dashboard → Settings → Environment Variables) ──
// JSONBIN_BIN_ID   = ID bin dari jsonbin.io
// JSONBIN_API_KEY  = API key dari jsonbin.io  
// ARR_PASSKEY_HASH = sha256(passkey + 'arr_salt_2025')  default: hash of 'arr121285'
// ARR_SECRET       = random string rahasia untuk sign token

const BIN_ID   = process.env.JSONBIN_BIN_ID;
const BIN_KEY  = process.env.JSONBIN_API_KEY;
const PK_HASH  = process.env.ARR_PASSKEY_HASH || hashPass('arr121285');
const SECRET   = process.env.ARR_SECRET || 'arr_secret_2025';

function hashPass(p){
  return crypto.createHash('sha256').update(p+'arr_salt_2025').digest('hex');
}

// ── JSONBin helpers ────────────────────────────────────────────────────────
async function readBin(){
  const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
    headers: { 'X-Master-Key': BIN_KEY, 'X-Bin-Meta': 'false' }
  });
  if(!r.ok) return [];
  const j = await r.json();
  return Array.isArray(j) ? j : [];
}

async function writeBin(data){
  await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
    method: 'PUT',
    headers: { 'Content-Type':'application/json', 'X-Master-Key': BIN_KEY },
    body: JSON.stringify(data)
  });
}

// ── Handler ────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();

  // GET → ambil semua preset
  if(req.method === 'GET'){
    try {
      const data = await readBin();
      return res.json({ ok: true, data });
    } catch(e){
      return res.json({ ok: false, msg: 'Gagal ambil data: '+e.message });
    }
  }

  // POST → upload preset baru
  if(req.method === 'POST'){
    const { passkey, title, link, by, vid } = req.body;
    if(hashPass(passkey) !== PK_HASH)
      return res.json({ ok: false, msg: 'Passkey salah' });
    if(!title || !link || !by)
      return res.json({ ok: false, msg: 'Judul, link, dan nama wajib diisi!' });

    try {
      const all = await readBin();
      const preset = {
        id   : 'p_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
        title: title.trim(),
        link : link.trim(),
        by   : by.trim(),
        vid  : vid || null,   // URL video (Catbox/Drive), bukan file upload
        at   : new Date().toISOString()
      };
      all.unshift(preset);
      await writeBin(all);
      return res.json({ ok: true, msg: `"${preset.title}" berhasil diupload!`, data: preset });
    } catch(e){
      return res.json({ ok: false, msg: 'Gagal simpan: '+e.message });
    }
  }

  return res.status(405).json({ ok: false, msg: 'Method not allowed' });
}
