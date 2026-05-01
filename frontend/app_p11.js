
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

// ── HAMMADDE HESAP ARACI ─────────────────────────────────────
let HH_YON = 'adet-kumas';   // 'adet-kumas' veya 'kumas-adet'
let HH_MOD = 'metre';        // 'metre' veya 'kg'

function hhYonSec(yon){
  HH_YON = yon;
  document.querySelectorAll('.hh-yon-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.yon === yon);
  });
  const adetWrap = document.getElementById('hh-adet-wrap');
  const miktarWrap = document.getElementById('hh-kumas-miktar-wrap');
  const baslik = document.getElementById('hh-hedef-baslik');
  const aciklama = document.getElementById('hh-yon-aciklama');
  if (yon === 'adet-kumas') {
    adetWrap.style.display = 'block';
    miktarWrap.style.display = 'none';
    baslik.textContent = 'Sipariş adedi';
    aciklama.textContent = 'Sipariş adedi için kaç metre/kg kumaş gerektiğini hesaplar.';
  } else {
    adetWrap.style.display = 'none';
    miktarWrap.style.display = 'block';
    baslik.textContent = 'Mevcut kumaş miktarı';
    aciklama.textContent = 'Elinizdeki kumaştan kaç ürün çıkacağını hesaplar.';
  }
  hhMiktarLabelGuncelle();
  hhHesapla();
}

function hhModSec(mod){
  HH_MOD = mod;
  document.querySelectorAll('.hh-mod-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.mod === mod);
  });
  document.querySelectorAll('.hh-kg-only').forEach(el => {
    el.style.display = mod === 'kg' ? 'block' : 'none';
  });
  hhMiktarLabelGuncelle();
  hhHesapla();
}

function hhMiktarLabelGuncelle(){
  const lbl = document.getElementById('hh-miktar-label');
  if (lbl) lbl.textContent = HH_MOD === 'kg' ? 'Kumaş miktarı (kg)' : 'Kumaş miktarı (metre)';
}