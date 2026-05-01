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

function fcHesapla() {
  if (!fcSeciliUrun) return;
  const veri     = fcSeciliUrun.veri;
  const kur      = usdTry || 0;
  const sipAdet  = parseInt(document.getElementById('fc-adet').value) || 0;

  document.getElementById('fc-kur-goster').textContent = kur ? `1 USD = ${kur.toFixed(2)} ₺` : 'Yükleniyor…';

  const toplamUSD = parseUSD(veri.maliyetler?.toplam);
  const baskiUSD  = parseUSD(veri.maliyetler?.baski);
  const urunUSD   = toplamUSD - baskiUSD;

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

document.addEventListener('click', e => {
  if (!e.target.closest('.fc-search') && !e.target.closest('.fc-dropdown')) {
    document.getElementById('fc-dropdown').classList.remove('open');
  }
});

function fcDetayAc() {
  if (!fcSeciliUrun) return;
  const panel = document.getElementById('fc-detail-panel');
  panel.classList.remove('hidden');
  document.getElementById('fc-detail-baslik').textContent =
    `${fcSeciliUrun.urun_adi} v${fcSeciliUrun.versiyon}`;

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
