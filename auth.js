// api/auth.js
// POST /api/auth        → cek passkey
// POST /api/auth + ?action=change → ganti passkey

import crypto from 'crypto';

const PK_HASH = process.env.ARR_PASSKEY_HASH || hashPass('arr121285');

function hashPass(p){
  return crypto.createHash('sha256').update(p+'arr_salt_2025').digest('hex');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if(req.method === 'OPTIONS') return res.status(200).end();
  if(req.method !== 'POST') return res.status(405).end();

  const { passkey, oldPass, newPass, action } = req.body;

  // Ganti passkey → hanya bisa via Vercel env, tidak bisa runtime di serverless
  // Karena env vars tidak bisa diubah dari kode — tampilkan instruksi
  if(action === 'change'){
    if(hashPass(oldPass) !== PK_HASH)
      return res.json({ ok: false, msg: 'Passkey lama salah!' });
    if(!newPass || newPass.length < 4)
      return res.json({ ok: false, msg: 'Passkey baru minimal 4 karakter!' });
    
    // Hitung hash baru dan kembalikan ke user untuk di-set manual di Vercel
    const newHash = hashPass(newPass);
    return res.json({
      ok: true,
      msg: 'Passkey baru berhasil dihitung!',
      instruction: `Set environment variable ARR_PASSKEY_HASH = ${newHash} di Vercel Dashboard`,
      newHash
    });
  }

  // Cek passkey biasa
  if(hashPass(passkey) === PK_HASH){
    return res.json({ ok: true });
  } else {
    return res.json({ ok: false, msg: 'Passkey salah' });
  }
}
