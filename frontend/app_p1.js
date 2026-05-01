
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
