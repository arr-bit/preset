// ARR Official — Config
// ⚠️ Jangan edit file ini sembarangan
(function(){
  const _k='arr_pk';
  const _d='arr_presets';
  // encode sederhana agar tidak langsung terbaca di source
  const _e=s=>btoa(unescape(encodeURIComponent(s)));
  const _x=s=>{try{return decodeURIComponent(escape(atob(s)))}catch{return s}};
  // default passkey (encoded) — ganti lewat UI "Ganti Passkey"
  const _def=_e('arr121285');
  window.__ARR={
    getPass:()=>{const v=localStorage.getItem(_k);return v?_x(v):_x(_def)},
    setPass:p=>localStorage.setItem(_k,_e(p)),
    getDB:()=>{try{return JSON.parse(localStorage.getItem(_d))||[]}catch{return[]}},
    setDB:d=>localStorage.setItem(_d,JSON.stringify(d)),
    dbKey:_d,
    pkKey:_k
  };
})();
