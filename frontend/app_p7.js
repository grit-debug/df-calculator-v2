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

function hhHesapla(){
  const urunEn  = parseFloat(document.getElementById('hh-urun-en').value) || 0;
  const urunBoy = parseFloat(document.getElementById('hh-urun-boy').value) || 0;
  const dikis   = parseFloat(document.getElementById('hh-dikis').value);
  const dp      = isNaN(dikis) || dikis < 0 ? 2 : dikis;
  const kumasEn = parseFloat(document.getElementById('hh-kumas-en').value) || 0;
  const gsm     = parseFloat(document.getElementById('hh-gsm').value) || 0;

  const sonuc = document.getElementById('hh-sonuc');

  if (urunEn <= 0 || urunBoy <= 0 || kumasEn <= 0) {
    sonuc.classList.add('hidden'); return;
  }

  // Metre/KG dönüşümü için: 1m kumaş = (kumasEn / 100) m² → kg = m² × gsm / 1000
  const m2PerMetre = kumasEn / 100;
  const kgPerMetre = HH_MOD === 'kg' ? (m2PerMetre * gsm / 1000) : 0;

  // KG modunda otomatik metre/kg hesabı göster
  if (HH_MOD === 'kg' && kgPerMetre > 0) {
    document.getElementById('hh-mkg').value = (1 / kgPerMetre).toFixed(3) + ' m/kg';
  } else if (HH_MOD === 'kg') {
    document.getElementById('hh-mkg').value = '';
  }

  const enDP = urunEn + 2 * dp;
  const boyDP = urunBoy + 2 * dp;
  const adetPerMetre = Math.floor(kumasEn / enDP);

  if (adetPerMetre <= 0) {
    sonuc.classList.remove('hidden');
    sonuc.style.background = '#7f1d1d';
    document.getElementById('hh-sonuc-deger').textContent = '⚠';
    document.getElementById('hh-sonuc-label').textContent = 'Ürün kumaşa sığmıyor';
    document.getElementById('hh-sonuc-detay').textContent =
      `Ürün eni (${enDP} cm dikiş paylı) kumaş eninden (${kumasEn} cm) büyük.`;
    return;
  }

  sonuc.style.background = 'var(--navy)';

  if (HH_YON === 'adet-kumas') {
    const adet = parseFloat(document.getElementById('hh-adet').value) || 0;
    if (adet <= 0) { sonuc.classList.add('hidden'); return; }

    const gerekenSerit = Math.ceil(adet / adetPerMetre);
    const gerekenMetre = gerekenSerit * (boyDP / 100);

    sonuc.classList.remove('hidden');
    document.getElementById('hh-sonuc-label').textContent = 'Gerekli kumaş miktarı';

    if (HH_MOD === 'metre') {
      document.getElementById('hh-sonuc-deger').textContent = `${gerekenMetre.toFixed(2)} m`;
      document.getElementById('hh-sonuc-detay').innerHTML =
        `${adet} adet için ${gerekenSerit} şerit gerekli<br>` +
        `1 şerit = ${boyDP} cm uzunluk (${urunBoy} cm + 2×${dp} cm dikiş payı)`;
    } else {
      if (kgPerMetre <= 0) {
        document.getElementById('hh-sonuc-deger').textContent = `${gerekenMetre.toFixed(2)} m`;
        document.getElementById('hh-sonuc-detay').textContent = 'KG hesabı için GSM girin';
      } else {
        const gerekenKg = gerekenMetre * kgPerMetre;
        document.getElementById('hh-sonuc-deger').textContent = `${gerekenKg.toFixed(2)} kg`;
        document.getElementById('hh-sonuc-detay').innerHTML =
          `${adet} adet için ${gerekenSerit} şerit, ${gerekenMetre.toFixed(2)} m kumaş<br>` +
          `Kumaş yoğunluğu: ${kgPerMetre.toFixed(3)} kg/m`;
      }
    }
  } else {
    // kumaş → adet
    const miktar = parseFloat(document.getElementById('hh-kumas-miktar').value) || 0;
    if (miktar <= 0) { sonuc.classList.add('hidden'); return; }

    let mevcutMetre = miktar;
    if (HH_MOD === 'kg') {
      if (kgPerMetre <= 0) {
        sonuc.classList.add('hidden'); return;
      }
      mevcutMetre = miktar / kgPerMetre;
    }

    const seritSayisi = Math.floor(mevcutMetre * 100 / boyDP);
    const toplamAdet = seritSayisi * adetPerMetre;

    sonuc.classList.remove('hidden');
    document.getElementById('hh-sonuc-label').textContent = 'Çıkacak ürün adedi';
    document.getElementById('hh-sonuc-deger').textContent = `${toplamAdet.toLocaleString('tr-TR')} adet`;
    document.getElementById('hh-sonuc-detay').innerHTML =
      `${HH_MOD === 'kg' ? miktar + ' kg ≈ ' + mevcutMetre.toFixed(2) + ' m kumaş' : miktar + ' m kumaş'}<br>` +
      `${seritSayisi} şerit × ${adetPerMetre} ürün = <strong>${toplamAdet}</strong>`;
  }
}
