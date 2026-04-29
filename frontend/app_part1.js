
let mode = null, baskiVar = false, baskiTip = 'sublimation', metreKgManual = false;
let usdTry = null;

const KUR_SOURCES = [
  {
    url: 'https://api.frankfurter.app/latest?from=USD&to=TRY',
    parse: d => ({ rate: d.rates.TRY, date: d.date, name: 'Frankfurter' })
  },
  {
    url: 'https://open.er-api.com/v6/latest/USD',
    parse: d => ({ rate: d.rates.TRY, date: d.time_last_update_utc?.slice(0,10) || '—', name: 'ExchangeRate-API' })
  },
  {
    url: 'https://api.exchangerate-api.com/v4/latest/USD',
    parse: d => ({ rate: d.rates.TRY, date: d.date || '—', name: 'ExchangeRate-API v4' })
  }
];

async function fetchKur() {
  for (const src of KUR_SOURCES) {
    try {
      const res = await fetch(src.url);
      if (!res.ok) continue;
      const data = await res.json();
      const { rate, date, name } = src.parse(data);
      if (!rate || rate <= 0) continue;

      usdTry = rate;
      document.getElementById('kur-loading').classList.add('hidden');
      const cc = document.getElementById('kur-content');
      cc.classList.remove('hidden');
      cc.style.display = 'flex';
      document.getElementById('kur-deger').textContent = usdTry.toFixed(2);
      document.getElementById('kur-tarih').textContent = date + ' (' + name + ')';
      calc();
      return; // başarılı, dur
    } catch(e) {
      continue; // bir sonraki kaynağı dene
    }
  }
  document.getElementById('kur-loading').classList.add('hidden');
  document.getElementById('kur-error').classList.remove('hidden');
  const mw = document.getElementById('kur-manuel-wrap');
  mw.classList.remove('hidden');
  mw.style.display = 'flex';
}

function onManuelKur() {
  const v = parseFloat(document.getElementById('kur-manuel').value);
  usdTry = v > 0 ? v : null;
  calc();
}

fetchKur();
setInterval(fetchKur, 60 * 60 * 1000);

function vn(id){ return parseFloat(document.getElementById(id)?.value) || 0; }

function fmtUSD(n){ return n > 0 ? '$ ' + n.toFixed(4) : '— $'; }
function fmtUSDsum(n){ return n > 0 ? '$ ' + n.toFixed(4) : '—'; }
function fmtTRY(n){
  if(!usdTry || n <= 0) return '';
  return '≈ ' + (n * usdTry).toFixed(2) + ' ₺';
}

function selectMode(m){
  mode = m;
  document.getElementById('card-metre').classList.toggle('active', m==='metre');
  document.getElementById('card-kg').classList.toggle('active', m==='kg');
  document.getElementById('metre-fields').classList.toggle('hidden', m!=='metre');
  document.getElementById('kg-fields').classList.toggle('hidden', m!=='kg');
  document.getElementById('main-content').classList.remove('hidden');
  calc();
}

function calcMetreKg(){
  const gsm = vn('gsm'), kumasEn = vn('kumas-en-kg');
  const mkEl = document.getElementById('metre-kg');
  const tipEl = document.getElementById('tip-metrekg');
  if(gsm > 0 && kumasEn > 0){
    const val = 1000000 / (gsm * kumasEn);
    mkEl.value = val.toFixed(3);
    metreKgManual = false;
    tipEl.textContent = '1.000.000 ÷ (' + gsm + ' × ' + kumasEn + ') = ' + val.toFixed(3) + ' m/kg';
  } else if(!metreKgManual){
    mkEl.value = '';
    tipEl.textContent = '';
  }
  calc();
}

function manualMetreKg(){
  metreKgManual = true;
  document.getElementById('tip-metrekg').textContent = 'Manuel değer girildi';
  calc();
}

let ekKalemId = 0;

function ekKalemEkle() {
  const id = ++ekKalemId;
  const wrap = document.getElementById('ekstra-kalemler');
  const div = document.createElement('div');
  div.id = 'ek-kalem-' + id;
  div.style.cssText = 'display:grid;grid-template-columns:1fr 160px auto;gap:10px;align-items:end;margin-bottom:.6rem';
  div.innerHTML = `
    <div class="field" style="margin-bottom:0">
      <label>Kalem adı</label>
      <input type="text" id="ek-ad-${id}" placeholder="örn. Bant" oninput="calc()"
        style="width:100%;padding:8px 10px;border:1px solid var(--border-strong);border-radius:var(--radius);font-size:14px;background:var(--bg);color:var(--text);outline:none;">
    </div>
    <div class="field" style="margin-bottom:0">
      <label>Tutar ($)</label>
      <div class="input-wrap">
        <span class="currency-badge">$</span>
        <input type="number" id="ek-tutar-${id}" placeholder="0" oninput="calc()">
      </div>
    </div>
    <button type="button" onclick="ekKalemSil(${id})" style="
      padding:8px 10px;background:transparent;border:1px solid #fca5a5;
      border-radius:var(--radius);color:#ef4444;cursor:pointer;font-size:14px;
      height:38px;flex-shrink:0;">✕</button>
  `;
  wrap.appendChild(div);
  calc();
}

function ekKalemSil(id) {
  const el = document.getElementById('ek-kalem-' + id);
  if (el) el.remove();
  calc();
}

function getEkKalemToplam() {
  let toplam = 0;
  document.querySelectorAll('[id^="ek-kalem-"]').forEach(div => {
    const id = div.id.replace('ek-kalem-', '');
    toplam += parseFloat(document.getElementById('ek-tutar-' + id)?.value) || 0;
  });
  return toplam;
}

let dtfBolgeId = 0;

function dtfBolgeEkle() {
  const id = ++dtfBolgeId;
  const wrap = document.getElementById('dtf-bolgeler');
  const div = document.createElement('div');
  div.id = 'dtf-bolge-' + id;
  div.style.cssText = 'display:grid;grid-template-columns:1fr 1fr auto;gap:10px;align-items:end;margin-bottom:.6rem';
  div.innerHTML = `
    <div class="field" style="margin-bottom:0">
      <label>Baskı eni (cm)</label>
      <input type="number" id="dtf-en-${id}" placeholder="örn. 20" oninput="calc()">
    </div>
    <div class="field" style="margin-bottom:0">
      <label>Baskı boyu (cm)</label>
      <input type="number" id="dtf-boy-${id}" placeholder="örn. 25" oninput="calc()">
    </div>
    <button type="button" onclick="dtfBolgeSil(${id})" style="
      padding:8px 10px; background:transparent; border:1px solid #fca5a5;
      border-radius:var(--radius); color:#ef4444; cursor:pointer; font-size:14px;
      height:38px; flex-shrink:0;">✕</button>
  `;
  wrap.appendChild(div);
  calc();
}

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

function autoAdet(urunEn, kumasEn){
  if(!urunEn || !kumasEn) return null;
  const a = Math.floor(kumasEn / urunEn);
  return a > 0 ? a : null;
}

const FIYAT_KADEMELERI = [
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
];

function renderFiyatListesi(urunMaliyet, baskiMaliyet) {
  baskiMaliyet = baskiMaliyet || 0;
  const sipAdet = vn('urun-adet-siparis');
  const wrap = document.getElementById('fiyat-listesi-wrap');
  const isDTF = baskiVar && baskiTip === 'dtf' && baskiMaliyet > 0;

  if (urunMaliyet <= 0 && baskiMaliyet <= 0) { wrap.classList.add('hidden'); return; }
  wrap.classList.remove('hidden');

  document.getElementById('th-dtf-baski').classList.toggle('hidden', !isDTF);

  let highlightIdx = -1;
  if (sipAdet > 0) {
    for (let i = FIYAT_KADEMELERI.length - 1; i >= 0; i--) {
      if (sipAdet >= FIYAT_KADEMELERI[i].adet) { highlightIdx = i; break; }
    }
    if (highlightIdx === -1) highlightIdx = 0;
  }

  const tbody = document.getElementById('fiyat-tbody');
  tbody.innerHTML = '';

  FIYAT_KADEMELERI.forEach((k, i) => {
    const urunM5      = urunMaliyet * 1.05;               // ürün maliyet +%5
    const baskiM5     = baskiMaliyet * 1.05;             // DTF baskı +%5
    const urunSatis   = urunM5 * (1 + k.marj);           // ürün kısmına marj
    const baskiSatis  = isDTF ? baskiM5 * (1 + k.marj) : 0; // DTF'ye aynı marj
    const satisFiyat  = urunSatis + baskiSatis;
    const toplam      = satisFiyat * k.adet;
    const isHighlight = i === highlightIdx;

    const tr = document.createElement('tr');
    if (isHighlight) tr.classList.add('highlight-row');

    const dtfCol = isDTF ? `
      <td>
        <span class="usd-val">$ ${baskiM5.toFixed(4)}</span>
        <span class="try-val">${fmtTRY(baskiM5)}</span>
      </td>` : '';

    tr.innerHTML = `
      <td class="${isHighlight ? 'current-row-adet' : ''}">${k.adet.toLocaleString('tr-TR')} adet</td>
      <td>
        <span class="usd-val">$ ${urunM5.toFixed(4)}</span>
        <span class="try-val">${fmtTRY(urunM5)}</span>
      </td>
      ${dtfCol}
      <td><span class="margin-badge">%${(k.marj * 100).toFixed(0)}</span></td>
      <td>
        <span class="usd-val">$ ${satisFiyat.toFixed(4)}</span>
        ${usdTry ? `<span class="try-prominent">${(satisFiyat * usdTry).toFixed(2)} ₺</span>` : ''}
      </td>
      <td>
        <span class="usd-val">$ ${toplam.toFixed(2)}</span>
        ${usdTry ? `<span class="try-prominent">${(toplam * usdTry).toLocaleString('tr-TR', {minimumFractionDigits:2, maximumFractionDigits:2})} ₺</span>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function calc(){
  const urunEn  = vn('urun-en');
  const urunBoy = vn('urun-boy');
  let kumasMaliyet = 0;

  if(mode === 'metre'){
    const mFiyat  = vn('metre-fiyat');
    const kumasEn = vn('kumas-en-m');
    let adet = vn('urun-adet-m');
    const auto = autoAdet(urunEn, kumasEn);
    if(!adet && auto){ adet = auto; document.getElementById('tip-m').textContent = 'Otomatik: ' + auto + ' ürün'; }
    else { document.getElementById('tip-m').textContent = ''; }
    const metreBasina = urunBoy > 0 && adet > 0 ? (100 / urunBoy) * adet : 0;
    kumasMaliyet = metreBasina > 0 ? mFiyat / metreBasina : 0;

  } else if(mode === 'kg'){
    const kgFiyat = vn('kg-fiyat');
    const kumasEn = vn('kumas-en-kg');
    const metreKg = vn('metre-kg');
    let adet = vn('urun-adet-kg');
    const auto = autoAdet(urunEn, kumasEn);
    if(!adet && auto){ adet = auto; document.getElementById('tip-kg').textContent = 'Otomatik: ' + auto + ' ürün'; }
    else { document.getElementById('tip-kg').textContent = ''; }
    const metreFiyat = metreKg > 0 ? kgFiyat / metreKg : 0;
    const metreBasina = urunBoy > 0 && adet > 0 ? (100 / urunBoy) * adet : 0;
    kumasMaliyet = metreBasina > 0 ? metreFiyat / metreBasina : 0;
  }

  setResult('kumas', kumasMaliyet);

  let baskiMaliyet = 0;
  if(baskiVar){
    if(baskiTip === 'sublimation'){
      const bFiyat  = vn('baski-fiyat');
      let bAdet = vn('baski-adet');
      const kumasEn = mode==='metre' ? vn('kumas-en-m') : vn('kumas-en-kg');
      const auto = autoAdet(urunEn, kumasEn);
      if(!bAdet && auto){ bAdet = auto; document.getElementById('tip-baski').textContent = 'Otomatik: ' + auto + ' baskı'; }
      else { document.getElementById('tip-baski').textContent = ''; }
      const bAlan = urunEn > 0 && urunBoy > 0 ? (urunEn/100) * (urunBoy/100) : 0;
      baskiMaliyet = bFiyat * bAlan;

    } else if(baskiTip === 'dtf'){
      const dtfRefEn    = vn('dtf-ref-en');
      const dtfRefBoy   = vn('dtf-ref-boy');
      const dtfRefFiyat = vn('dtf-ref-fiyat');
      const bolgeler    = getDtfBolgeler();
      const baskiAdedi  = bolgeler.length;

      let dtfBaskiMaliyet = 0;
      if(dtfRefEn > 0 && dtfRefBoy > 0 && dtfRefFiyat > 0 && baskiAdedi > 0){
        const birimAlanFiyat = dtfRefFiyat / (dtfRefEn * dtfRefBoy); // $/cm²
        let satirlar = '';
        bolgeler.forEach((b, idx) => {
          const bolge = birimAlanFiyat * (1 + b.en * b.boy);
          dtfBaskiMaliyet += bolge;
          satirlar += `Bölge ${idx+1}: (1 + ${b.en}×${b.boy}) × $${birimAlanFiyat.toFixed(6)} = $${bolge.toFixed(4)}<br>`;
        });
        document.getElementById('res-dtf-baski-usd').textContent = '$ ' + dtfBaskiMaliyet.toFixed(4);
        document.getElementById('res-dtf-baski-try').textContent = fmtTRY(dtfBaskiMaliyet);
        document.getElementById('dtf-baski-formul').innerHTML =
          `Birim alan: $${birimAlanFiyat.toFixed(6)}/cm² | ${baskiAdedi} bölge<br>${satirlar}Toplam: $${dtfBaskiMaliyet.toFixed(4)}`;
      } else {
        document.getElementById('res-dtf-baski-usd').textContent = '— $';
        document.getElementById('res-dtf-baski-try').textContent = '';
        document.getElementById('dtf-baski-formul').textContent = baskiAdedi === 0 ? '⚠ En az 1 baskı bölgesi ekleyin' : '';
      }

      const pressMesai       = vn('press-mesai');
      const pressMaas        = vn('press-maas');       // ₺
      const pressYerlestirme = vn('press-yerlestirme');
      const pressSure        = vn('press-sure');

      let pressMaliyet = 0;
      if(pressMesai > 0 && pressMaas > 0 && pressYerlestirme > 0 && pressSure > 0){
        const gundePressTekBolge = (pressMesai * 60) / (pressYerlestirme + pressSure);
        const pressMaasUSD = usdTry && usdTry > 0 ? pressMaas / usdTry : 0;
        const pressTekilMaliyet = pressMaasUSD / gundePressTekBolge;
        pressMaliyet = pressTekilMaliyet * (baskiAdedi || 1);
        document.getElementById('res-press-usd').textContent = '$ ' + pressMaliyet.toFixed(4);
        document.getElementById('res-press-try').textContent = fmtTRY(pressMaliyet);
        document.getElementById('press-formul').innerHTML =
          `Günde press (tek bölge): ${gundePressTekBolge.toFixed(1)} adet<br>` +
          `₺${pressMaas} → $${pressMaasUSD.toFixed(2)} ÷ ${gundePressTekBolge.toFixed(1)} = $${pressTekilMaliyet.toFixed(4)}/bölge<br>` +
          `× ${baskiAdedi || 1} bölge = $${pressMaliyet.toFixed(4)}`;
      } else {
        document.getElementById('res-press-usd').textContent = '— $';
        document.getElementById('res-press-try').textContent = '';
        document.getElementById('press-formul').textContent = usdTry ? '' : '⚠ Kur bilgisi bekleniyor';
      }

      baskiMaliyet = (dtfBaskiMaliyet + pressMaliyet) * 1.05;
    }
  }
  setResult('baski', baskiMaliyet);

  const uretimIds = ['dikim','kesim','paket','dolum','astar','cirt','biye','lastik','fermuar','sacak','fire'];
  let uretim = 0;
  uretimIds.forEach(id => uretim += vn('p-' + id));
  uretim += getEkKalemToplam();
  setResult('uretim', uretim);

  const toplam = kumasMaliyet + baskiMaliyet + uretim;
  document.getElementById('sum-total-usd').textContent = toplam > 0 ? '$ ' + toplam.toFixed(4) : '—';
  document.getElementById('sum-total-try').textContent = fmtTRY(toplam);

  renderFiyatListesi(kumasMaliyet + uretim, baskiMaliyet);
}

function setResult(key, val){
  document.getElementById('res-' + key + '-usd').textContent = fmtUSD(val);
  document.getElementById('res-' + key + '-try').textContent = fmtTRY(val);
  document.getElementById('sum-' + key + '-usd').textContent = fmtUSDsum(val);
  document.getElementById('sum-' + key + '-try').textContent = fmtTRY(val);
}

const API = window.location.origin;

const token = localStorage.getItem('df_token');
if (!token) { window.location.href = '/login.html'; }
document.getElementById('header-user-ad').textContent =
  localStorage.getItem('df_ad') || '';

function authHeaders() {
  return { 'Content-Type': 'application/json',
           'Authorization': 'Bearer ' + localStorage.getItem('df_token') };
}

function cikisYap() {
  localStorage.removeItem('df_token');
  localStorage.removeItem('df_ad');
  window.location.href = '/login.html';
}

async function kullaniciPaneliAc() {
  document.getElementById('kullanici-modal').classList.add('open');
  await kullanicilariYukle();
}

function kullaniciPaneliKapat() {
  document.getElementById('kullanici-modal').classList.remove('open');
  ['yeni-ad','yeni-email','yeni-sifre'].forEach(id => document.getElementById(id).value = '');
  const err = document.getElementById('kullanici-error');
  err.style.display = 'none';
}

async function kullanicilariYukle() {
  try {
    const res = await fetch(`${API}/api/kullanicilar`, { headers: authHeaders() });
    const liste = await res.json();
    const el = document.getElementById('kullanici-listesi');
    el.innerHTML = liste.map(u => `
      <div class="user-row">
        <div>
          <div style="font-weight:600;color:var(--text)">${u.ad}</div>
          <div style="font-size:12px;color:var(--text-muted)">${u.email}</div>
        </div>
      </div>`).join('');
  } catch(e) { console.error(e); }
}

async function kullaniciEkle() {
  const ad    = document.getElementById('yeni-ad').value.trim();
  const email = document.getElementById('yeni-email').value.trim();
  const sifre = document.getElementById('yeni-sifre').value;
  const errEl = document.getElementById('kullanici-error');
  errEl.style.display = 'none';

  if (!ad || !email || !sifre) {
    errEl.textContent = 'Tüm alanlar zorunludur.';
    errEl.style.display = 'block';
    return;
  }
  try {
    const res = await fetch(`${API}/api/kullanicilar`, {
      method: 'POST', headers: authHeaders(),
      body: JSON.stringify({ ad, email, sifre })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.detail || 'Hata.'; errEl.style.display = 'block'; return; }
    ['yeni-ad','yeni-email','yeni-sifre'].forEach(id => document.getElementById(id).value = '');
    await kullanicilariYukle();
  } catch(e) { errEl.textContent = 'Sunucu hatası.'; errEl.style.display = 'block'; }
}

