
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