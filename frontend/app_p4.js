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
