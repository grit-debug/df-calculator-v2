
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