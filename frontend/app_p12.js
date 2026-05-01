
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

  const m2PerMetre = kumasEn / 100;
  const kgPerMetre = HH_MOD === 'kg' ? (m2PerMetre * gsm / 1000) : 0;

  if (HH_MOD === 'kg' && kgPerMetre > 0) {
    document.getElementById('hh-mkg').value = (1 / kgPerMetre).toFixed(3) + ' m/kg';
  } else if (HH_MOD === 'kg') {
    document.getElementById('hh-mkg').value = '';
  }

  // İki yön — daha çok ürün sığan yerleşimi seç
  const enDP  = urunEn  + dp;
  const boyDP = urunBoy + dp;
  const dik   = Math.floor(kumasEn / enDP);   // ürün dik: en kumaş enine
  const yatik = Math.floor(kumasEn / boyDP);  // ürün yatık: boy kumaş enine

  let adetPerMetre, kullanilanKenar, kalanBoy, yonText;
  if (dik >= yatik && dik > 0) {
    adetPerMetre = dik;
    kullanilanKenar = enDP;
    kalanBoy = boyDP;          // her şerit boyu (kumaş uzunluğunda)
    yonText = `Dik yerleşim (eni ${enDP} cm)`;
  } else if (yatik > 0) {
    adetPerMetre = yatik;
    kullanilanKenar = boyDP;
    kalanBoy = enDP;
    yonText = `Yatık yerleşim (boyu ${boyDP} cm)`;
  } else {
    sonuc.classList.remove('hidden');
    sonuc.style.background = '#7f1d1d';
    document.getElementById('hh-sonuc-deger').textContent = '⚠';
    document.getElementById('hh-sonuc-label').textContent = 'Ürün kumaşa sığmıyor';
    document.getElementById('hh-sonuc-detay').textContent =
      `Hem ${enDP} cm (dik) hem ${boyDP} cm (yatık) kumaş eninden (${kumasEn} cm) büyük.`;
    return;
  }

  sonuc.style.background = 'var(--navy)';

  if (HH_YON === 'adet-kumas') {
    const adet = parseFloat(document.getElementById('hh-adet').value) || 0;
    if (adet <= 0) { sonuc.classList.add('hidden'); return; }

    const gerekenSerit = Math.ceil(adet / adetPerMetre);
    const gerekenMetre = gerekenSerit * (kalanBoy / 100);

    sonuc.classList.remove('hidden');
    document.getElementById('hh-sonuc-label').textContent = 'Gerekli kumaş miktarı';

    if (HH_MOD === 'metre') {
      document.getElementById('hh-sonuc-deger').textContent = `${gerekenMetre.toFixed(2)} m`;
      document.getElementById('hh-sonuc-detay').innerHTML =
        `${yonText} · ${adet} adet için ${gerekenSerit} şerit gerekli<br>` +
        `1 şerit = ${kalanBoy} cm uzunluk`;
    } else {
      if (kgPerMetre <= 0) {
        document.getElementById('hh-sonuc-deger').textContent = `${gerekenMetre.toFixed(2)} m`;
        document.getElementById('hh-sonuc-detay').textContent = 'KG hesabı için GSM girin';
      } else {
        const gerekenKg = gerekenMetre * kgPerMetre;
        document.getElementById('hh-sonuc-deger').textContent = `${gerekenKg.toFixed(2)} kg`;
        document.getElementById('hh-sonuc-detay').innerHTML =
          `${yonText} · ${adet} adet için ${gerekenSerit} şerit, ${gerekenMetre.toFixed(2)} m kumaş<br>` +
          `Kumaş yoğunluğu: ${kgPerMetre.toFixed(3)} kg/m`;
      }
    }
  } else {
    const miktar = parseFloat(document.getElementById('hh-kumas-miktar').value) || 0;
    if (miktar <= 0) { sonuc.classList.add('hidden'); return; }

    let mevcutMetre = miktar;
    if (HH_MOD === 'kg') {
      if (kgPerMetre <= 0) {
        sonuc.classList.add('hidden'); return;
      }
      mevcutMetre = miktar / kgPerMetre;
    }

    const seritSayisi = Math.floor(mevcutMetre * 100 / kalanBoy);
    const toplamAdet = seritSayisi * adetPerMetre;

    sonuc.classList.remove('hidden');
    document.getElementById('hh-sonuc-label').textContent = 'Çıkacak ürün adedi';
    document.getElementById('hh-sonuc-deger').textContent = `${toplamAdet.toLocaleString('tr-TR')} adet`;
    document.getElementById('hh-sonuc-detay').innerHTML =
      `${yonText}<br>` +
      `${HH_MOD === 'kg' ? miktar + ' kg ≈ ' + mevcutMetre.toFixed(2) + ' m kumaş' : miktar + ' m kumaş'}<br>` +
      `${seritSayisi} şerit × ${adetPerMetre} ürün = <strong>${toplamAdet}</strong>`;
  }
}
