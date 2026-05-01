
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