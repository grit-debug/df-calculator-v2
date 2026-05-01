function dtfBolgeSil(id) {
  const el = document.getElementById('dtf-bolge-' + id);
  if (el) el.remove();
  calc();
}

function getDtfBolgeler() {
  const results = [];
  document.querySelectorAll('[id^="dtf-bolge-"]').forEach(div => {
    const id = div.id.replace('dtf-bolge-', '');
    const en  = parseFloat(document.getElementById('dtf-en-'  + id)?.value) || 0;
    const boy = parseFloat(document.getElementById('dtf-boy-' + id)?.value) || 0;
    if (en > 0 && boy > 0) results.push({ en, boy });
  });
  return results;
}

function toggleBaski(on){
  baskiVar = on;
  document.getElementById('baski-detay').classList.toggle('hidden', !on);
  document.getElementById('baski-yok-btn').classList.toggle('active', !on);
  document.getElementById('baski-var-btn').classList.toggle('active', on);
  calc();
}

function selectBaskiTip(tip){
  baskiTip = tip;
  document.getElementById('btn-subli').classList.toggle('active', tip==='sublimation');
  document.getElementById('btn-dtf').classList.toggle('active', tip==='dtf');
  document.getElementById('subli-fields').classList.toggle('hidden', tip!=='sublimation');
  document.getElementById('dtf-fields').classList.toggle('hidden', tip!=='dtf');
  if(tip === 'dtf' && document.getElementById('dtf-bolgeler').children.length === 0){
    dtfBolgeEkle();
  }
  calc();
}

function getDikisPayi(){
  const v = parseFloat(document.getElementById('dikis-payi')?.value);
  return isNaN(v) || v < 0 ? 2 : v;
}

function urunEnDikisPayli(urunEn){
  return urunEn > 0 ? urunEn + 2 * getDikisPayi() : 0;
}

function autoAdet(urunEn, kumasEn){
  if(!urunEn || !kumasEn) return null;
  const enDP = urunEnDikisPayli(urunEn);
  const a = Math.floor(kumasEn / enDP);
  return a > 0 ? a : null;
}

function updateFireInfo(urunEn, kumasEn, adet){
  const wrap = document.getElementById('fire-info');
  if (!wrap) return;
  if (!urunEn || !kumasEn || !adet || adet <= 0) {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');

  const dp = getDikisPayi();
  const enDP = urunEnDikisPayli(urunEn);
  const kullanilan = enDP * adet;
  const fire = kumasEn - kullanilan;
  const firePct = kumasEn > 0 ? (fire / kumasEn * 100) : 0;
  const dpNot = dp > 0 ? ` (${urunEn} cm + 2×${dp} cm dikiş payı)` : '';

  document.getElementById('fire-detay').innerHTML =
    `1 metrede <strong>${adet} ürün</strong> çıkar (ürün eni ${enDP} cm${dpNot}).<br>` +
    `Kullanılan: ${kullanilan} cm &nbsp;·&nbsp; Fire: <strong>${fire.toFixed(1)} cm</strong> ` +
    `(<span style="color:${firePct > 5 ? '#dc2626' : 'var(--green)'}">%${firePct.toFixed(1)}</span>)`;

  // 3 öneri: kumaş enine tam bölünen yakın ürün eni alternatifleri
  const oneriler = generateBoyutOnerileri(urunEn, kumasEn, dp);
  const oneriWrap = document.getElementById('fire-oneriler');
  const btnWrap = document.getElementById('fire-oneri-butonlari');
  if (oneriler.length === 0) {
    oneriWrap.style.display = 'none';
  } else {
    oneriWrap.style.display = 'block';
    btnWrap.innerHTML = oneriler.map(o => `
      <button type="button" class="fire-oneri-btn" onclick="uygulaBoyut(${o.urunEn})">
        ${o.urunEn} cm <span class="badge">${o.adet} ürün · fire %${o.firePct.toFixed(1)}</span>
      </button>
    `).join('');
  }
}

function generateBoyutOnerileri(mevcutEn, kumasEn, dp){
  const oneriler = [];
  const seen = new Set([mevcutEn]);
  // mevcut ürün enine yakın boyutlardan başlayarak tarayalım
  for (let delta = -10; delta <= 15 && oneriler.length < 3; delta++) {
    if (delta === 0) continue;
    const yeniEn = mevcutEn + delta;
    if (yeniEn <= 5 || seen.has(yeniEn)) continue;
    seen.add(yeniEn);
    const enDP = yeniEn + 2 * dp;
    const adet = Math.floor(kumasEn / enDP);
    if (adet <= 0) continue;
    const kullanilan = enDP * adet;
    const fire = kumasEn - kullanilan;
    const firePct = kumasEn > 0 ? (fire / kumasEn * 100) : 0;
    if (firePct < 3) {
      oneriler.push({ urunEn: yeniEn, adet, firePct });
    }
  }
  // En düşük fire'a göre sırala, sonra mevcut boyuta yakınlığa göre
  oneriler.sort((a, b) => a.firePct - b.firePct || Math.abs(a.urunEn - mevcutEn) - Math.abs(b.urunEn - mevcutEn));
  return oneriler.slice(0, 3);
}

function uygulaBoyut(yeniEn){
  document.getElementById('urun-en').value = yeniEn;
  calc();
}

const FIYAT_KADEMELERI_TUM = {
  yuksek: [
    { adet: 200,    marj: 1.80 },
    { adet: 400,    marj: 1.60 },
    { adet: 1000,   marj: 1.40 },
    { adet: 2000,   marj: 1.20 },
    { adet: 3000,   marj: 1.00 },
    { adet: 4000,   marj: 0.90 },
    { adet: 5000,   marj: 0.80 },
    { adet: 10000,  marj: 0.75 },
    { adet: 20000,  marj: 0.72 },
    { adet: 50000,  marj: 0.69 },
    { adet: 100000, marj: 0.62 },
  ],
  orta: [
    { adet: 200,    marj: 1.40 },
    { adet: 400,    marj: 1.25 },
    { adet: 1000,   marj: 1.05 },
    { adet: 2000,   marj: 0.90 },
    { adet: 3000,   marj: 0.75 },
    { adet: 4000,   marj: 0.65 },
    { adet: 5000,   marj: 0.55 },
    { adet: 10000,  marj: 0.50 },
    { adet: 20000,  marj: 0.48 },
    { adet: 50000,  marj: 0.45 },
    { adet: 100000, marj: 0.40 },
  ],
  dusuk: [
    { adet: 200,    marj: 1.00 },
    { adet: 400,    marj: 0.85 },
    { adet: 1000,   marj: 0.75 },
    { adet: 2000,   marj: 0.65 },
    { adet: 3000,   marj: 0.50 },
    { adet: 4000,   marj: 0.45 },
    { adet: 5000,   marj: 0.40 },
    { adet: 10000,  marj: 0.35 },
    { adet: 20000,  marj: 0.32 },
    { adet: 50000,  marj: 0.30 },
    { adet: 100000, marj: 0.28 },
  ],
};
let MARJ_SEVIYE = 'yuksek';
let FIYAT_KADEMELERI = FIYAT_KADEMELERI_TUM.yuksek;
