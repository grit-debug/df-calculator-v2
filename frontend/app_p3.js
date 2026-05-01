
function uygulaBoyut(kenar, yeniDeger){
  const inputId = kenar === 'en' ? 'urun-en' : 'urun-boy';
  document.getElementById(inputId).value = yeniDeger;
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

function marjSeviyeSec(seviye) {
  MARJ_SEVIYE = seviye;
  FIYAT_KADEMELERI = FIYAT_KADEMELERI_TUM[seviye] || FIYAT_KADEMELERI_TUM.yuksek;
  document.querySelectorAll('.marj-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.marj === seviye);
  });
  if (typeof calc === 'function') calc();
}

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