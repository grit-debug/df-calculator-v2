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

