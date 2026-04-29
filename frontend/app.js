
let mode = null, baskiVar = false, baskiTip = 'sublimation', metreKgManual = false;
let usdTry = null;

// ── KUR FETCH ──────────────────────────────────────────────────
// Kaynaklar sırayla denenir, ilk başarılı olan kullanılır
const KUR_SOURCES = [
  {
    // Frankfurter eski domain — CORS destekli
    url: 'https://api.frankfurter.app/latest?from=USD&to=TRY',
    parse: d => ({ rate: d.rates.TRY, date: d.date, name: 'Frankfurter' })
  },
  {
    // ExchangeRate-API açık erişim — CORS destekli, key gerektirmez
    url: 'https://open.er-api.com/v6/latest/USD',
    parse: d => ({ rate: d.rates.TRY, date: d.time_last_update_utc?.slice(0,10) || '—', name: 'ExchangeRate-API' })
  },
  {
    // ExchangeRate.host v6 — yedek
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
  // Hiçbiri çalışmadı
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
// Sayfada açık kaldıkça her 60 dakikada bir güncelle
setInterval(fetchKur, 60 * 60 * 1000);

// ── HELPERS ───────────────────────────────────────────────────
function vn(id){ return parseFloat(document.getElementById(id)?.value) || 0; }

function fmtUSD(n){ return n > 0 ? '$ ' + n.toFixed(4) : '— $'; }
function fmtUSDsum(n){ return n > 0 ? '$ ' + n.toFixed(4) : '—'; }
function fmtTRY(n){
  if(!usdTry || n <= 0) return '';
  return '≈ ' + (n * usdTry).toFixed(2) + ' ₺';
}

// ── MODE ──────────────────────────────────────────────────────
function selectMode(m){
  mode = m;
  document.getElementById('card-metre').classList.toggle('active', m==='metre');
  document.getElementById('card-kg').classList.toggle('active', m==='kg');
  document.getElementById('metre-fields').classList.toggle('hidden', m!=='metre');
  document.getElementById('kg-fields').classList.toggle('hidden', m!=='kg');
  document.getElementById('main-content').classList.remove('hidden');
  calc();
}

// ── GSM → METRE/KG ───────────────────────────────────────────
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

// ── EK ÜRETİM KALEMLERİ ──────────────────────────────────────
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
  // Tüm aktif bölgelerin en×boy dizisini döndür
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
  // DTF ilk seçildiğinde boşsa 1 bölge otomatik ekle
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

// ── FİYAT KADEMELERİ ─────────────────────────────────────────
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

  // DTF sütununu göster/gizle
  document.getElementById('th-dtf-baski').classList.toggle('hidden', !isDTF);

  // Sipariş adedine göre vurgulanan satır
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
      // ── DTF BASKISI ──
      const dtfRefEn    = vn('dtf-ref-en');
      const dtfRefBoy   = vn('dtf-ref-boy');
      const dtfRefFiyat = vn('dtf-ref-fiyat');
      const bolgeler    = getDtfBolgeler();
      const baskiAdedi  = bolgeler.length;

      let dtfBaskiMaliyet = 0;
      if(dtfRefEn > 0 && dtfRefBoy > 0 && dtfRefFiyat > 0 && baskiAdedi > 0){
        const birimAlanFiyat = dtfRefFiyat / (dtfRefEn * dtfRefBoy); // $/cm²
        // Her bölge için ayrı DTF maliyeti hesapla, topla
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

      // ── PRESS — baskı adedi kadar çarpılır (her bölge = 1 press işlemi) ──
      const pressMesai       = vn('press-mesai');
      const pressMaas        = vn('press-maas');       // ₺
      const pressYerlestirme = vn('press-yerlestirme');
      const pressSure        = vn('press-sure');

      let pressMaliyet = 0;
      if(pressMesai > 0 && pressMaas > 0 && pressYerlestirme > 0 && pressSure > 0){
        const gundePressTekBolge = (pressMesai * 60) / (pressYerlestirme + pressSure);
        const pressMaasUSD = usdTry && usdTry > 0 ? pressMaas / usdTry : 0;
        // Birim başına maliyet = (maaş / günde tek bölge press) × baskı bölge adedi
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

      // Toplam DTF = (DTF baskı + Press) × 1.05
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

  // baskiMaliyet'i ayrıca geçiriyoruz — DTF durumunda fiyat listesinde ayrı marjlanacak
  renderFiyatListesi(kumasMaliyet + uretim, baskiMaliyet);
}

function setResult(key, val){
  document.getElementById('res-' + key + '-usd').textContent = fmtUSD(val);
  document.getElementById('res-' + key + '-try').textContent = fmtTRY(val);
  document.getElementById('sum-' + key + '-usd').textContent = fmtUSDsum(val);
  document.getElementById('sum-' + key + '-try').textContent = fmtTRY(val);
}

// ── KAYDET & GEÇMİŞ ──────────────────────────────────────────
// ── API AYARI ─────────────────────────────────────────────────
const API = window.location.origin;

// ── AUTH GUARD ────────────────────────────────────────────────
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

// ── KULLANICI YÖNETİMİ ────────────────────────────────────────
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

// Modal dışına tıklayınca kapat
document.getElementById('kullanici-modal').addEventListener('click', function(e) {
  if (e.target === this) kullaniciPaneliKapat();
});


function buildSnapData() {
  const _baskiVar = document.getElementById('baski-var-btn')?.classList.contains('active') || false;
  const _baskiTip = document.getElementById('btn-dtf')?.classList.contains('active') ? 'dtf' : 'sublimation';
  const _isDTF    = _baskiVar && _baskiTip === 'dtf';
  const _mode     = document.getElementById('card-metre')?.classList.contains('active') ? 'metre' : 'kg';

  const sabitKalemler = [
    ['p-dikim','Dikim'],['p-kesim','Kesim'],['p-paket','Paket'],
    ['p-dolum','Dolum'],['p-astar','Astar / Tela'],['p-cirt','Cırt'],
    ['p-biye','Biye'],['p-lastik','Lastik'],['p-fermuar','Fermuar'],
    ['p-sacak','Saçak'],['p-fire','Fire / Diğer']
  ].map(([id,ad]) => ({ ad, tutar: vn(id) })).filter(k => k.tutar > 0);

  const ekKalemler = [];
  document.querySelectorAll('[id^="ek-kalem-"]').forEach(div => {
    const id = div.id.replace('ek-kalem-','');
    const ad = document.getElementById('ek-ad-'+id)?.value||'';
    const tutar = parseFloat(document.getElementById('ek-tutar-'+id)?.value)||0;
    if (ad||tutar>0) ekKalemler.push({ad,tutar});
  });

  const hammadde = _mode==='metre' ? {
    mod:'Metre', metreFiyat:vn('metre-fiyat'),
    kumasEn:vn('kumas-en-m'), urunAdet:vn('urun-adet-m'),
  } : {
    mod:'Kilogram', kgFiyat:vn('kg-fiyat'),
    kumasEn:vn('kumas-en-kg'), gsm:vn('gsm'),
    metreKg:vn('metre-kg'), urunAdet:vn('urun-adet-kg'),
  };

  let baskiDetay = null;
  if (_baskiVar) {
    if (_baskiTip==='sublimation') {
      baskiDetay = { tip:'Süblimasyon', fiyat:vn('baski-fiyat'), adet:vn('baski-adet') };
    } else {
      baskiDetay = {
        tip:'DTF', refEn:vn('dtf-ref-en'), refBoy:vn('dtf-ref-boy'), refFiyat:vn('dtf-ref-fiyat'),
        bolgeler:getDtfBolgeler(),
        pressMesai:vn('press-mesai'), pressMaas:vn('press-maas'),
        pressYerlestirme:vn('press-yerlestirme'), pressSure:vn('press-sure'),
      };
    }
  }

  const g = id => document.getElementById(id)?.textContent?.trim()||'';
  return {
    mode:_mode, isDTF:_isDTF,
    urunEn:vn('urun-en')||null, urunBoy:vn('urun-boy')||null,
    sipAdet:vn('urun-adet-siparis')||null,
    usdTry:usdTry?.toFixed(2)||null,
    hammadde, baskiDetay, sabitKalemler, ekKalemler,
    maliyetler:{
      kumas:g('sum-kumas-usd'), kumasTRY:g('sum-kumas-try'),
      baski:g('sum-baski-usd'), baskiTRY:g('sum-baski-try'),
      uretim:g('sum-uretim-usd'), uretimTRY:g('sum-uretim-try'),
      toplam:g('sum-total-usd'), toplamTRY:g('sum-total-try'),
    },
  };
}

// ── KAYDET ───────────────────────────────────────────────────
async function hesabiKaydet() {
  const ad = prompt('Ürün adını girin (aynı isim = yeni versiyon):','');
  if (!ad) return;
  const veri = buildSnapData();
  try {
    const res = await fetch(`${API}/api/urunler`,{
      method:'POST', headers: authHeaders(),
      body: JSON.stringify({ urun_adi: ad, veri })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    alert(`✅ "${ad}" v${data.versiyon} olarak kaydedildi!`);
    gecmisYukle();
  } catch(e) { alert('Kayıt hatası: '+e.message); }
}

// ── GEÇMİŞ ──────────────────────────────────────────────────
async function gecmisYukle() {
  try {
    const res = await fetch(`${API}/api/urunler`, { headers: authHeaders() });
    const liste = await res.json();
    const wrap = document.getElementById('gecmis-wrap');
    const el   = document.getElementById('gecmis-liste');
    if (!liste.length) { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    el.innerHTML = liste.map(k=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:.75rem 1.25rem;border-bottom:1px solid var(--border);gap:1rem;flex-wrap:wrap">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--text)">${k.urun_adi}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">v${k.versiyon} · ${k.tarih} · ${k.kullanici_ad||''}</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <a href="${API}/api/urunler/${k.id}/excel?token=${localStorage.getItem('df_token')}" target="_blank"
             style="padding:5px 12px;background:#16a34a;color:#fff;border-radius:var(--radius);font-size:12px;font-weight:600;text-decoration:none">
            📊 Excel
          </a>
        </div>
      </div>`).join('');
  } catch(e) { console.error('Geçmiş yüklenemedi:',e); }
}

async function kayitSil(id) {
  if (!confirm('Bu kayıt silinsin mi?')) return;
  try {
    await fetch(`${API}/api/hesaplar/${id}`, { method:'DELETE', headers: authHeaders() });
    gecmisYukle();
  } catch(e) { alert('Silme hatası: '+e.message); }
}

window.addEventListener('load', () => { gecmisYukle(); const l = document.getElementById('main-logo'); if(l && typeof LOGO_SRC !== 'undefined') l.src = LOGO_SRC; });

// ── EXCEL (sunucu tarafında üretiliyor) ──────────────────────
function exportExcel() {
  window.open(`${API}/api/export/excel/tumu?token=${localStorage.getItem('df_token')}`,'_blank');
}

function parseUSD(s) {
  try { return parseFloat(String(s).replace(/[^0-9.\-]/g,''))||0; }
  catch { return 0; }
}

// ── PDF (jsPDF — client side) ────────────────────────────────
function exportPDF() {
  const veri = buildSnapData();
  const ad   = prompt('PDF için başlık:','') || 'Teklif';
  buildPDFContent({ ...veri, ad, tarih: new Date().toLocaleString('tr-TR') });
}

function buildPDFContent(snap) {
  const load = (cb) => {
    if (window.jspdf) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = cb; document.head.appendChild(s);
  };
  load(() => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a4' });
    const W = 210, M = 18;
    let y = 0;

    doc.setFillColor(26,39,68); doc.rect(0,0,W,28,'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text('DEMFABRIKA', M, 16);
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text('Fiyat Teklifi', M, 22);
    doc.text(snap.tarih||'', W-M, 22, {align:'right'});

    y = 38;
    doc.setTextColor(26,39,68);
    doc.setFontSize(13); doc.setFont('helvetica','bold');
    doc.text(snap.ad||'', M, y); y += 8;
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,120);
    doc.text(`USD/TRY: ${snap.usdTry||'—'}  |  Mod: ${snap.mode==='metre'?'Metre':'KG'}  |  Baskı: ${snap.baskiDetay?.tip||'Yok'}`, M, y); y += 10;

    doc.setFillColor(240,242,248);
    doc.roundedRect(M, y, W-M*2, 32, 3, 3, 'F');
    doc.setTextColor(26,39,68); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text('Maliyet Özeti', M+5, y+7);
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    const m = snap.maliyetler||{};
    doc.text('Hammadde: '+(m.kumas||'—'), M+5, y+14);
    doc.text('Baskı: '+(m.baski||'—'), M+5, y+20);
    doc.text('Üretim: '+(m.uretim||'—'), M+5, y+26);
    doc.setFont('helvetica','bold');
    doc.text('Toplam: '+(m.toplam||'—')+'  ('+(m.toplamTRY||'')+')', M+90, y+26);
    y += 40;

    // Fiyat tablosu
    const kur = parseFloat(snap.usdTry)||0;
    const baskiUSD = parseUSD(m.baski);
    const toplamUSD = parseUSD(m.toplam);
    const urunUSD = toplamUSD - baskiUSD;
    const MARJLAR = [[200,1.80],[400,1.60],[1000,1.40],[2000,1.20],[3000,1.00],
      [4000,0.90],[5000,0.80],[10000,0.75],[20000,0.72],[50000,0.69],[100000,0.62]];

    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(26,39,68);
    doc.text('Fiyat Listesi', M, y); y += 6;
    doc.setFillColor(26,39,68); doc.setTextColor(255,255,255);
    doc.rect(M, y, W-M*2, 7, 'F');
    doc.setFontSize(8); doc.setFont('helvetica','bold');
    const cx = [M+2, M+25, M+70, M+105, M+140];
    ['Adet','Kar Marjı','Birim Satış ($)','Birim Satış (₺)','Toplam ($)'].forEach((h,i)=>doc.text(h,cx[i],y+5));
    y += 8;
    doc.setTextColor(26,39,68); doc.setFont('helvetica','normal');
    MARJLAR.forEach(([adet,marj],idx) => {
      const bs = (urunUSD*1.05*(1+marj))+(baskiUSD*1.05*(1+marj));
      const tot = bs*adet;
      if (idx%2===0){doc.setFillColor(245,246,250);doc.rect(M,y-1,W-M*2,7,'F');}
      doc.setFontSize(8);
      [adet.toLocaleString('tr-TR'), `%${Math.round(marj*100)}`,
       `$${bs.toFixed(4)}`, kur?`${(bs*kur).toFixed(2)} ₺`:'—', `$${tot.toFixed(2)}`
      ].forEach((v,i)=>doc.text(String(v),cx[i],y+4));
      y+=7; if(y>270){doc.addPage();y=20;}
    });

    doc.setFontSize(8); doc.setTextColor(160,160,180);
    doc.text('DemFabrika — Fiyat Hesaplayıcı', M, 290);
    doc.text('Sayfa 1', W-M, 290, {align:'right'});
    doc.save(`DemFabrika_Teklif_${(snap.ad||'').replace(/\s+/g,'_')}.pdf`);
  });
}


function resetAll(){
  document.querySelectorAll('input[type=number]:not(#kur-manuel)').forEach(i => i.value = '');
  mode = null; baskiVar = false; baskiTip = 'sublimation'; metreKgManual = false;
  ['card-metre','card-kg'].forEach(id => document.getElementById(id).classList.remove('active'));
  document.getElementById('main-content').classList.add('hidden');
  document.getElementById('baski-detay').classList.add('hidden');
  document.getElementById('baski-yok-btn').classList.add('active');
  document.getElementById('baski-var-btn').classList.remove('active');
  document.getElementById('btn-subli').classList.add('active');
  document.getElementById('btn-dtf').classList.remove('active');
  document.getElementById('subli-fields').classList.remove('hidden');
  document.getElementById('dtf-fields').classList.add('hidden');
  document.getElementById('dtf-bolgeler').innerHTML = '';
  dtfBolgeId = 0;
  ['res-dtf-baski-usd','res-press-usd'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = '— $'; });
  ['res-dtf-baski-try','res-press-try','dtf-baski-formul','press-formul'].forEach(id => { const el = document.getElementById(id); if(el) el.textContent = ''; });
  ['kumas','baski','uretim'].forEach(k => {
    document.getElementById('res-'+k+'-usd').textContent = '— $';
    document.getElementById('res-'+k+'-try').textContent = '';
    document.getElementById('sum-'+k+'-usd').textContent = '—';
    document.getElementById('sum-'+k+'-try').textContent = '';
  });
  document.getElementById('sum-total-usd').textContent = '—';
  document.getElementById('sum-total-try').textContent = '';
  ['tip-m','tip-kg','tip-baski','tip-metrekg'].forEach(id => document.getElementById(id).textContent = '');
  document.getElementById('ekstra-kalemler').innerHTML = '';
  ekKalemId = 0;
  document.getElementById('fiyat-listesi-wrap').classList.add('hidden');
  document.getElementById('fiyat-tbody').innerHTML = '';
// ── SEKME YÖNETİMİ ───────────────────────────────────────────
function sekmeAc(id) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  event.target.classList.add('active');
  if (id === 'fiyat-kontrol') {
    document.getElementById('fc-kur-goster').textContent = usdTry ? ('1 USD = ' + usdTry.toFixed(2) + ' \u20BA') : 'Yukleniyor...';
  }
}

// ── FİYAT KONTROL ─────────────────────────────────────────────
const MARJLAR_FC = [
  [200,1.80],[400,1.60],[1000,1.40],[2000,1.20],[3000,1.00],
  [4000,0.90],[5000,0.80],[10000,0.75],[20000,0.72],[50000,0.69],[100000,0.62]
];

let fcSeciliUrun = null;   // { urun_adi, versiyon, id, veri }
let fcAraTimeout = null;

async function fcAra() {
  const q = document.getElementById('fc-ara').value.trim();
  clearTimeout(fcAraTimeout);
  if (!q) { document.getElementById('fc-dropdown').classList.remove('open'); return; }
  fcAraTimeout = setTimeout(async () => {
    try {
      const res = await fetch(`${API}/api/urunler?ara=${encodeURIComponent(q)}`, { headers: authHeaders() });
      const liste = await res.json();
      const dd = document.getElementById('fc-dropdown');
      if (!liste.length) {
        dd.innerHTML = '<div style="padding:.75rem 1rem;color:var(--text-muted);font-size:13px">Sonuç bulunamadı</div>';
      } else {
        dd.innerHTML = liste.map(u => `
          <div class="fc-item" onclick="fcUrunSec('${u.urun_adi.replace(/'/g,"\\'")}')">
            <div class="fc-item-name">${u.urun_adi}</div>
            <div class="fc-item-meta">v${u.versiyon} · ${u.tarih} · ${u.kullanici_ad || ''}</div>
          </div>`).join('');
      }
      dd.classList.add('open');
    } catch(e) { console.error(e); }
  }, 300);
}

async function fcUrunSec(urunAdi) {
  document.getElementById('fc-dropdown').classList.remove('open');
  document.getElementById('fc-ara').value = urunAdi;

  // Versiyonları yükle
  const res = await fetch(`${API}/api/urunler/${encodeURIComponent(urunAdi)}/versiyonlar`, { headers: authHeaders() });
  const versiyonlar = await res.json();

  const sel = document.getElementById('fc-versiyon-sec');
  sel.innerHTML = versiyonlar.map(v =>
    `<option value="${v.versiyon}" data-id="${v.id}">v${v.versiyon} — ${v.tarih}</option>`
  ).join('');

  document.getElementById('fc-secili').classList.remove('hidden');
  document.getElementById('fc-urun-adi-goster').textContent = urunAdi;
  await fcVersiyonSec();
}

async function fcVersiyonSec() {
  const sel = document.getElementById('fc-versiyon-sec');
  const opt = sel.options[sel.selectedIndex];
  const urunAdi = document.getElementById('fc-urun-adi-goster').textContent;
  const versiyon = parseInt(opt.value);
  const urunId  = opt.dataset.id;

  const res = await fetch(`${API}/api/urunler/${encodeURIComponent(urunAdi)}/${versiyon}`, { headers: authHeaders() });
  const data = await res.json();
  fcSeciliUrun = { ...data, veri: data.veri };

  document.getElementById('fc-versiyon-meta').textContent =
    `v${versiyon} · Kaydeden: ${data.kullanici_ad || '—'} · ${data.tarih}`;

  // Excel butonu
  document.getElementById('fc-excel-btn').href =
    `${API}/api/urunler/${urunId}/excel?token=${localStorage.getItem('df_token')}`;

  fcHesapla();
}

function fcHesapla() {
  if (!fcSeciliUrun) return;
  const veri     = fcSeciliUrun.veri;
  const kur      = usdTry || 0;
  const sipAdet  = parseInt(document.getElementById('fc-adet').value) || 0;

  // Kur göster
  document.getElementById('fc-kur-goster').textContent = kur ? `1 USD = ${kur.toFixed(2)} ₺` : 'Yükleniyor…';

  const toplamUSD = parseUSD(veri.maliyetler?.toplam);
  const baskiUSD  = parseUSD(veri.maliyetler?.baski);
  const urunUSD   = toplamUSD - baskiUSD;

  // Hero fiyat — sipariş adedine en yakın kademe
  if (sipAdet > 0 && toplamUSD > 0) {
    let kademe = MARJLAR_FC[0];
    for (const k of MARJLAR_FC) { if (sipAdet >= k[0]) kademe = k; }
    const bs  = (urunUSD * 1.05 * (1 + kademe[1])) + (baskiUSD * 1.05 * (1 + kademe[1]));
    document.getElementById('fc-hero').style.display = 'block';
    document.getElementById('fc-hero-usd').textContent = `$${bs.toFixed(4)}`;
    document.getElementById('fc-hero-try').textContent = kur ? `≈ ${(bs * kur).toFixed(2)} ₺` : '';
    document.getElementById('fc-hero-adet').textContent =
      `${sipAdet.toLocaleString('tr-TR')} adet için — %${Math.round(kademe[1]*100)} kar marjı`;
  } else {
    document.getElementById('fc-hero').style.display = 'none';
  }

  // Tablo
  const tbody = document.getElementById('fc-fiyat-tbody');
  tbody.innerHTML = '';
  MARJLAR_FC.forEach(([adet, marj]) => {
    if (toplamUSD <= 0) return;
    const bs   = (urunUSD*1.05*(1+marj)) + (baskiUSD*1.05*(1+marj));
    const tot  = bs * adet;
    const isHl = sipAdet > 0 && adet <= sipAdet;
    const tr   = document.createElement('tr');
    if (isHl) tr.classList.add('highlight-row');
    tr.innerHTML = `
      <td>${adet.toLocaleString('tr-TR')}</td>
      <td><span class="margin-badge">%${Math.round(marj*100)}</span></td>
      <td><span class="usd-val">$${bs.toFixed(4)}</span></td>
      <td><span class="try-prominent">${kur?(bs*kur).toFixed(2)+' ₺':'—'}</span></td>
      <td><span class="usd-val">$${tot.toFixed(2)}</span></td>
      <td><span class="try-prominent">${kur?(tot*kur).toLocaleString('tr-TR',{minimumFractionDigits:2,maximumFractionDigits:2})+' ₺':'—'}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// Arama dışına tıklayınca kapat
document.addEventListener('click', e => {
  if (!e.target.closest('.fc-search') && !e.target.closest('.fc-dropdown')) {
    document.getElementById('fc-dropdown').classList.remove('open');
  }
});

// ── MALİYET DETAY PANELİ ─────────────────────────────────────
function fcDetayAc() {
  if (!fcSeciliUrun) return;
  const panel = document.getElementById('fc-detail-panel');
  panel.classList.remove('hidden');
  document.getElementById('fc-detail-baslik').textContent =
    `${fcSeciliUrun.urun_adi} v${fcSeciliUrun.versiyon}`;

  // Hesap makinesi formunu detay paneline klonla (basit JSON editörü)
  const veri = fcSeciliUrun.veri;
  const icerik = document.getElementById('fc-detail-icerik');
  icerik.innerHTML = `
    <div style="font-size:12px;color:var(--text-muted);margin-bottom:.75rem">
      Maliyetleri düzenleyip kaydedin — yeni versiyon olarak eklenir.
    </div>
    <div class="row3">
      <div class="field"><label>Hammadde ($)</label>
        <div class="input-wrap"><span class="currency-badge">USD</span>
        <input type="number" id="fc-edit-kumas" value="${parseUSD(veri.maliyetler?.kumas).toFixed(4)}" step="0.0001">
        </div></div>
      <div class="field"><label>Baskı ($)</label>
        <div class="input-wrap"><span class="currency-badge">USD</span>
        <input type="number" id="fc-edit-baski" value="${parseUSD(veri.maliyetler?.baski).toFixed(4)}" step="0.0001">
        </div></div>
      <div class="field"><label>Üretim ($)</label>
        <div class="input-wrap"><span class="currency-badge">USD</span>
        <input type="number" id="fc-edit-uretim" value="${parseUSD(veri.maliyetler?.uretim).toFixed(4)}" step="0.0001">
        </div></div>
    </div>
    <div style="font-size:12px;color:var(--text-muted);margin-top:.5rem">
      Toplam otomatik hesaplanır. Detaylı değişiklik için Hesap Makinesi'ni kullanın.
    </div>
  `;
  panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function fcDetayKapat() {
  document.getElementById('fc-detail-panel').classList.add('hidden');
}

async function fcDetayKaydet() {
  if (!fcSeciliUrun) return;
  const kumas  = parseFloat(document.getElementById('fc-edit-kumas').value) || 0;
  const baski  = parseFloat(document.getElementById('fc-edit-baski').value) || 0;
  const uretim = parseFloat(document.getElementById('fc-edit-uretim').value) || 0;
  const toplam = kumas + baski + uretim;
  const kur    = usdTry || 0;

  const yeniVeri = {
    ...fcSeciliUrun.veri,
    maliyetler: {
      kumas:     `$ ${kumas.toFixed(4)}`,
      kumasTRY:  kur ? `≈ ${(kumas*kur).toFixed(2)} ₺` : '',
      baski:     `$ ${baski.toFixed(4)}`,
      baskiTRY:  kur ? `≈ ${(baski*kur).toFixed(2)} ₺` : '',
      uretim:    `$ ${uretim.toFixed(4)}`,
      uretimTRY: kur ? `≈ ${(uretim*kur).toFixed(2)} ₺` : '',
      toplam:    `$ ${toplam.toFixed(4)}`,
      toplamTRY: kur ? `≈ ${(toplam*kur).toFixed(2)} ₺` : '',
    }
  };

  try {
    const res = await fetch(`${API}/api/urunler/${fcSeciliUrun.id}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ veri: yeniVeri })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    alert(`✅ v${data.versiyon} olarak kaydedildi!`);
    fcDetayKapat();
    await fcUrunSec(fcSeciliUrun.urun_adi);
  } catch(e) { alert('Kayıt hatası: ' + e.message); }
}
