
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

function getDikisPayi(){
  const v = parseFloat(document.getElementById('dikis-payi')?.value);
  return isNaN(v) || v < 0 ? 2 : v;
}

// Optimum yerleşim: ürünü dik ya da yatık yerleştir, hangisi daha çok sığarsa onu seç
function bestFit(urunEn, urunBoy, kumasEn){
  if (!urunEn || !urunBoy || !kumasEn) return null;
  const dp = getDikisPayi();
  const enDP  = urunEn  + dp;
  const boyDP = urunBoy + dp;
  const dik     = Math.floor(kumasEn / enDP);   // ürün dik (eni kumaş enine)
  const yatik   = Math.floor(kumasEn / boyDP);  // ürün yatık (boyu kumaş enine)
  if (dik <= 0 && yatik <= 0) return null;
  // Daha çok ürün sığan yerleşim kazanır
  if (dik >= yatik) {
    return { adet: dik, kullanilanKenar: enDP, kullanilanLabel: 'en', orijinalKenar: urunEn,
             diger: boyDP, digerLabel: 'boy', digerOrijinal: urunBoy, yon: 'dik' };
  }
  return   { adet: yatik, kullanilanKenar: boyDP, kullanilanLabel: 'boy', orijinalKenar: urunBoy,
             diger: enDP, digerLabel: 'en', digerOrijinal: urunEn, yon: 'yatik' };
}

function autoAdet(urunEn, kumasEn){
  // urunBoy gerekli — global getter
  const urunBoy = parseFloat(document.getElementById('urun-boy')?.value) || 0;
  const fit = bestFit(urunEn, urunBoy, kumasEn);
  return fit ? fit.adet : null;
}

function updateFireInfo(urunEn, kumasEn, adet){
  const wrap = document.getElementById('fire-info');
  if (!wrap) return;
  const urunBoy = parseFloat(document.getElementById('urun-boy')?.value) || 0;
  if (!urunEn || !urunBoy || !kumasEn || !adet || adet <= 0) {
    wrap.classList.add('hidden');
    return;
  }
  wrap.classList.remove('hidden');

  const dp = getDikisPayi();
  const fit = bestFit(urunEn, urunBoy, kumasEn);
  if (!fit) { wrap.classList.add('hidden'); return; }

  const kullanilan = fit.kullanilanKenar * fit.adet;
  const fire = kumasEn - kullanilan;
  const firePct = kumasEn > 0 ? (fire / kumasEn * 100) : 0;
  const dpNot = dp > 0 ? ` (${fit.orijinalKenar} cm + ${dp} cm dikiş payı)` : '';
  const yonNot = fit.yon === 'dik' ? '↕ Dik' : '↔ Yatık';

  document.getElementById('fire-detay').innerHTML =
    `1 metrede <strong>${fit.adet} ürün</strong> çıkar — ${yonNot} yerleşim<br>` +
    `Kumaş enine yerleşen kenar: <strong>${fit.kullanilanLabel} ${fit.kullanilanKenar} cm</strong>${dpNot}<br>` +
    `Kullanılan: ${kullanilan} cm &nbsp;·&nbsp; Fire: <strong>${fire.toFixed(1)} cm</strong> ` +
    `(<span style="color:${firePct > 5 ? '#dc2626' : 'var(--green)'}">%${firePct.toFixed(1)}</span>)`;

  // 3 öneri: kullanılan kenarı daha iyi optimize eden alternatifler
  const oneriler = generateBoyutOnerileri(fit.orijinalKenar, fit.kullanilanLabel, kumasEn, dp, urunEn, urunBoy);
  const oneriWrap = document.getElementById('fire-oneriler');
  const btnWrap = document.getElementById('fire-oneri-butonlari');
  if (oneriler.length === 0) {
    oneriWrap.style.display = 'none';
  } else {
    oneriWrap.style.display = 'block';
    btnWrap.innerHTML = oneriler.map(o => `
      <button type="button" class="fire-oneri-btn" onclick="uygulaBoyut('${o.kenar}', ${o.deger})">
        ${o.kenar === 'en' ? 'Eni' : 'Boyu'} ${o.deger} cm <span class="badge">${o.adet} ürün · fire %${o.firePct.toFixed(1)}</span>
      </button>
    `).join('');
  }
}

function generateBoyutOnerileri(mevcutKenar, kenarTipi, kumasEn, dp, urunEn, urunBoy){
  const oneriler = [];
  const seen = new Set([mevcutKenar]);
  for (let delta = -10; delta <= 15 && oneriler.length < 6; delta++) {
    if (delta === 0) continue;
    const yeniDeger = mevcutKenar + delta;
    if (yeniDeger <= 5 || seen.has(yeniDeger)) continue;
    seen.add(yeniDeger);
    // Yeni boyutla bestFit hesapla
    const testEn  = kenarTipi === 'en'  ? yeniDeger : urunEn;
    const testBoy = kenarTipi === 'boy' ? yeniDeger : urunBoy;
    const enDP  = testEn  + dp;
    const boyDP = testBoy + dp;
    const dik   = Math.floor(kumasEn / enDP);
    const yatik = Math.floor(kumasEn / boyDP);
    let adet, kullanilanK;
    if (dik >= yatik) { adet = dik;   kullanilanK = enDP;  }
    else              { adet = yatik; kullanilanK = boyDP; }
    if (adet <= 0) continue;
    const fire = kumasEn - kullanilanK * adet;
    const firePct = kumasEn > 0 ? (fire / kumasEn * 100) : 0;
    if (firePct < 3) {
      oneriler.push({ kenar: kenarTipi, deger: yeniDeger, adet, firePct });
    }
  }
  oneriler.sort((a, b) => a.firePct - b.firePct || Math.abs(a.deger - mevcutKenar) - Math.abs(b.deger - mevcutKenar));
  return oneriler.slice(0, 3);
}