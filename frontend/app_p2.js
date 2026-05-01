
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