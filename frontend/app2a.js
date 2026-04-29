
// Modal dışına tıklayınca kapat
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

// ── KAYDET ───────────────────────────────────────────────────
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

// ── GEÇMİŞ ──────────────────────────────────────────────────
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

// ── EXCEL (sunucu tarafında üretiliyor) ──────────────────────
function exportExcel() {
  window.open(`${API}/api/export/excel/tumu?token=${localStorage.getItem('df_token')}`,'_blank');
}

function parseUSD(s) {
  try { return parseFloat(String(s).replace(/[^0-9.\-]/g,''))||0; }
  catch { return 0; }
}

// ── PDF (jsPDF — client side) ────────────────────────────────
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

    // Fiyat tablosu
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
