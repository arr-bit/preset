// api/delete.js
// POST /api/delete   → hapus preset by id

import crypto from 'crypto';

const BIN_ID  = process.env.JSONBIN_BIN_ID;
const BIN_KEY = process.env.JSONBIN_API_KEY;
const PK_HASH = process.env.ARR_PASSKEY_HASH || hashPass('arr121285');

function hashPass(p){
  return crypto.createHash('sha256').update(p+'arr_salt_2025').digest('hex');
}

async function readBin(){
  const r = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`,{
    headers:{'X-Master-Key':BIN_KEY,'X-Bin-Meta':'false'}
  });
  if(!r.ok) return [];
  const j = await r.json();
  return Array.isArray(j)?j:[];
}

async function writeBin(data){
  await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`,{
    method:'PUT',
    headers:{'Content-Type':'application/json','X-Master-Key':BIN_KEY},
    body:JSON.stringify(data)
  });
}

export default async function handler(req, res){
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type');
  if(req.method==='OPTIONS') return res.status(200).end();
  if(req.method!=='POST') return res.status(405).end();

  const { passkey, id } = req.body;
  if(hashPass(passkey) !== PK_HASH)
    return res.json({ ok:false, msg:'Passkey salah' });
  if(!id)
    return res.json({ ok:false, msg:'ID tidak ada' });

  try {
    const all = await readBin();
    const filtered = all.filter(p=>p.id!==id);
    if(filtered.length === all.length)
      return res.json({ ok:false, msg:'Preset tidak ditemukan' });
    await writeBin(filtered);
    return res.json({ ok:true, msg:'Preset dihapus.' });
  } catch(e){
    return res.json({ ok:false, msg:'Gagal hapus: '+e.message });
  }
}
