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
function sekmeAc(id) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + id).classList.add('active');
  event.target.classList.add('active');
  if (id === 'fiyat-kontrol') {
    document.getElementById('fc-kur-goster').textContent = usdTry ? ('1 USD = ' + usdTry.toFixed(2) + ' \u20BA') : 'Yukleniyor...';
  }
}

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

  document.getElementById('fc-excel-btn').href =
    `${API}/api/urunler/${urunId}/excel?token=${localStorage.getItem('df_token')}`;

  fcHesapla();
}

