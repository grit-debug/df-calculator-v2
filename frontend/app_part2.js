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

async function hesabiKaydet() {
  const ad = prompt('Ürün adını girin (aynı isim = yeni versiyon):','');
  if (!ad) return;
  const veri = buildSnapData();
  try {
    const res = await fetch(`${API}/api/urunler`,{
      method:'POST', headers: authHeaders(),
      body: JSON.stringify({ urun_adi: ad, veri })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    alert(`✅ "${ad}" v${data.versiyon} olarak kaydedildi!`);
    gecmisYukle();
  } catch(e) { alert('Kayıt hatası: '+e.message); }
}

async function gecmisYukle() {
  try {
    const res = await fetch(`${API}/api/urunler`, { headers: authHeaders() });
    const liste = await res.json();
    const wrap = document.getElementById('gecmis-wrap');
    const el   = document.getElementById('gecmis-liste');
    if (!liste.length) { wrap.classList.add('hidden'); return; }
    wrap.classList.remove('hidden');
    el.innerHTML = liste.map(k=>`
      <div style="display:flex;align-items:center;justify-content:space-between;padding:.75rem 1.25rem;border-bottom:1px solid var(--border);gap:1rem;flex-wrap:wrap">
        <div>
          <div style="font-size:14px;font-weight:600;color:var(--text)">${k.urun_adi}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">v${k.versiyon} · ${k.tarih} · ${k.kullanici_ad||''}</div>
        </div>
        <div style="display:flex;gap:8px;flex-shrink:0">
          <a href="${API}/api/urunler/${k.id}/excel?token=${localStorage.getItem('df_token')}" target="_blank"
             style="padding:5px 12px;background:#16a34a;color:#fff;border-radius:var(--radius);font-size:12px;font-weight:600;text-decoration:none">
            📊 Excel
          </a>
        </div>
      </div>`).join('');
  } catch(e) { console.error('Geçmiş yüklenemedi:',e); }
}

async function kayitSil(id) {
  if (!confirm('Bu kayıt silinsin mi?')) return;
  try {
    await fetch(`${API}/api/hesaplar/${id}`, { method:'DELETE', headers: authHeaders() });
    gecmisYukle();
  } catch(e) { alert('Silme hatası: '+e.message); }
}

window.addEventListener('load', () => { gecmisYukle(); const l = document.getElementById('main-logo'); if(l && typeof LOGO_SRC !== 'undefined') l.src = LOGO_SRC; });

function exportExcel() {
  window.open(`${API}/api/export/excel/tumu?token=${localStorage.getItem('df_token')}`,'_blank');
}

function parseUSD(s) {
  try { return parseFloat(String(s).replace(/[^0-9.\-]/g,''))||0; }
  catch { return 0; }
}

function exportPDF() {
  const veri = buildSnapData();
  const ad   = prompt('PDF için başlık:','') || 'Teklif';
  buildPDFContent({ ...veri, ad, tarih: new Date().toLocaleString('tr-TR') });
}

function buildPDFContent(snap) {
  const load = (cb) => {
    if (window.jspdf) { cb(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = cb; document.head.appendChild(s);
  };
  load(() => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit:'mm', format:'a4' });
    const W = 210, M = 18;
    let y = 0;

    doc.setFillColor(26,39,68); doc.rect(0,0,W,28,'F');
    doc.setTextColor(255,255,255);
    doc.setFontSize(16); doc.setFont('helvetica','bold');
    doc.text('DEMFABRIKA', M, 16);
    doc.setFontSize(9); doc.setFont('helvetica','normal');
    doc.text('Fiyat Teklifi', M, 22);
    doc.text(snap.tarih||'', W-M, 22, {align:'right'});

    y = 38;
    doc.setTextColor(26,39,68);
    doc.setFontSize(13); doc.setFont('helvetica','bold');
    doc.text(snap.ad||'', M, y); y += 8;
    doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(100,100,120);
    doc.text(`USD/TRY: ${snap.usdTry||'—'}  |  Mod: ${snap.mode==='metre'?'Metre':'KG'}  |  Baskı: ${snap.baskiDetay?.tip||'Yok'}`, M, y); y += 10;

    doc.setFillColor(240,242,248);
    doc.roundedRect(M, y, W-M*2, 32, 3, 3, 'F');
    doc.setTextColor(26,39,68); doc.setFontSize(10); doc.setFont('helvetica','bold');
    doc.text('Maliyet Özeti', M+5, y+7);
    doc.setFont('helvetica','normal'); doc.setFontSize(9);
    const m = snap.maliyetler||{};
    doc.text('Hammadde: '+(m.kumas||'—'), M+5, y+14);
    doc.text('Baskı: '+(m.baski||'—'), M+5, y+20);
    doc.text('Üretim: '+(m.uretim||'—'), M+5, y+26);
    doc.setFont('helvetica','bold');
    doc.text('Toplam: '+(m.toplam||'—')+'  ('+(m.toplamTRY||'')+')', M+90, y+26);
    y += 40;

    const kur = parseFloat(snap.usdTry)||0;
    const baskiUSD = parseUSD(m.baski);
    const toplamUSD = parseUSD(m.toplam);
    const urunUSD = toplamUSD - baskiUSD;
    const MARJLAR = [[200,1.80],[400,1.60],[1000,1.40],[2000,1.20],[3000,1.00],
      [4000,0.90],[5000,0.80],[10000,0.75],[20000,0.72],[50000,0.69],[100000,0.62]];

    doc.setFont('helvetica','bold'); doc.setFontSize(10); doc.setTextColor(26,39,68);
    doc.text('Fiyat Listesi', M, y); y += 6;
    doc.setFillColor(26,39,68); doc.setTextColor(255,255,255);
    doc.rect(M, y, W-M*2, 7, 'F');
    doc.setFontSize(8); doc.setFont('helvetica','bold');
    const cx = [M+2, M+25, M+70, M+105, M+140];
    ['Adet','Kar Marjı','Birim Satış ($)','Birim Satış (₺)','Toplam ($)'].forEach((h,i)=>doc.text(h,cx[i],y+5));
    y += 8;
    doc.setTextColor(26,39,68); doc.setFont('helvetica','normal');
    MARJLAR.forEach(([adet,marj],idx) => {
      const bs = (urunUSD*1.05*(1+marj))+(baskiUSD*1.05*(1+marj));
      const tot = bs*adet;
      if (idx%2===0){doc.setFillColor(245,246,250);doc.rect(M,y-1,W-M*2,7,'F');}
      doc.setFontSize(8);
      [adet.toLocaleString('tr-TR'), `%${Math.round(marj*100)}`,
       `$${bs.toFixed(4)}`, kur?`${(bs*kur).toFixed(2)} ₺`:'—', `$${tot.toFixed(2)}`
      ].forEach((v,i)=>doc.text(String(v),cx[i],y+4));
      y+=7; if(y>270){doc.addPage();y=20;}
    });

    doc.setFontSize(8); doc.setTextColor(160,160,180);
    doc.text('DemFabrika — Fiyat Hesaplayıcı', M, 290);
    doc.text('Sayfa 1', W-M, 290, {align:'right'});
    doc.save(`DemFabrika_Teklif_${(snap.ad||'').replace(/\s+/g,'_')}.pdf`);
  });
}

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

async function fcDetayKaydet() {
  if (!fcSeciliUrun) return;
  const kumas  = parseFloat(document.getElementById('fc-edit-kumas').value) || 0;
  const baski  = parseFloat(document.getElementById('fc-edit-baski').value) || 0;
  const uretim = parseFloat(document.getElementById('fc-edit-uretim').value) || 0;
  const toplam = kumas + baski + uretim;
  const kur    = usdTry || 0;

  const yeniVeri = {
    ...fcSeciliUrun.veri,
    maliyetler: {
      kumas:     `$ ${kumas.toFixed(4)}`,
      kumasTRY:  kur ? `≈ ${(kumas*kur).toFixed(2)} ₺` : '',
      baski:     `$ ${baski.toFixed(4)}`,
      baskiTRY:  kur ? `≈ ${(baski*kur).toFixed(2)} ₺` : '',
      uretim:    `$ ${uretim.toFixed(4)}`,
      uretimTRY: kur ? `≈ ${(uretim*kur).toFixed(2)} ₺` : '',
      toplam:    `$ ${toplam.toFixed(4)}`,
      toplamTRY: kur ? `≈ ${(toplam*kur).toFixed(2)} ₺` : '',
    }
  };

  try {
    const res = await fetch(`${API}/api/urunler/${fcSeciliUrun.id}`, {
      method: 'PUT', headers: authHeaders(),
      body: JSON.stringify({ veri: yeniVeri })
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    alert(`✅ v${data.versiyon} olarak kaydedildi!`);
    fcDetayKapat();
    await fcUrunSec(fcSeciliUrun.urun_adi);
  } catch(e) { alert('Kayıt hatası: ' + e.message); }
}
