import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
import re

NAVY  = "1A2744"
WHITE = "FFFFFF"
LIGHT = "F0F2F8"
GREEN = "16A34A"
BORDER_COLOR = "C4CCDE"

MARJLAR = [
    (200, 1.80), (400, 1.60), (1000, 1.40), (2000, 1.20), (3000, 1.00),
    (4000, 0.90), (5000, 0.80), (10000, 0.75), (20000, 0.72),
    (50000, 0.69), (100000, 0.62),
]

def parse_usd(s):
    try:
        return float(re.sub(r"[^\d.\-]", "", str(s))) or 0.0
    except:
        return 0.0

def bot_border():
    s = Side(style="thin", color=BORDER_COLOR)
    return Border(bottom=s)

def hdr_font(bold=False, color=WHITE):
    return Font(name="Arial", bold=bold, size=10, color=color)

def apply_row(ws, row_idx, values, bold=False, bg=None, right_cols=None, num_fmts=None):
    right_cols = right_cols or []
    num_fmts   = num_fmts   or {}
    for ci, val in enumerate(values, 1):
        c = ws.cell(row_idx, ci, val)
        c.font   = Font(name="Arial", bold=bold, size=10,
                        color=WHITE if bg == NAVY else NAVY)
        if bg:
            c.fill = PatternFill("solid", fgColor=bg)
        c.alignment = Alignment(
            horizontal="right" if ci in right_cols else "left",
            vertical="center"
        )
        if ci in num_fmts:
            c.number_format = num_fmts[ci]
        c.border = bot_border()

def build_wb(snap: dict):
    wb = openpyxl.Workbook()

    # ── ÖZET ──────────────────────────────────────────────────
    ws_oz = wb.active
    ws_oz.title = "Özet"
    _write_ozet_row(ws_oz, snap)

    # ── DETAY ─────────────────────────────────────────────────
    safe = _safe_name(snap.get("ad", "Hesap"))
    ws_d = wb.create_sheet(safe)
    _write_detay(ws_d, snap)

    # ── FİYAT LİSTESİ ─────────────────────────────────────────
    ws_fl = wb.create_sheet(safe[:25] + "_FL")
    _write_fiyat_listesi(ws_fl, snap)

    return wb

def build_wb_multi(snaps: list):
    wb = openpyxl.Workbook()
    ws_oz = wb.active
    ws_oz.title = "Özet"

    # Özet başlık
    headers = ["Ürün Adı","Tarih","Mod","Baskı Tipi","USD/TRY",
               "Ürün Eni","Ürün Boyu","Sipariş Adedi",
               "Hammadde ($)","Baskı ($)","Üretim ($)","Toplam ($)","Toplam (₺)"]
    apply_row(ws_oz, 1, headers, bold=True, bg=NAVY)
    ws_oz.column_dimensions["A"].width = 22
    for ci, w in enumerate([22,18,8,12,10,10,10,12,13,13,13,13,14], 1):
        ws_oz.column_dimensions[chr(64+ci)].width = w

    for ri, snap in enumerate(snaps, 2):
        _write_ozet_row(ws_oz, snap, row=ri)
        safe = _safe_name(snap.get("ad","Hesap"))
        ws_d  = wb.create_sheet(safe[:28])
        _write_detay(ws_d, snap)
        ws_fl = wb.create_sheet(safe[:25] + "_FL")
        _write_fiyat_listesi(ws_fl, snap)

    return wb

# ── YARDIMCI FONKSİYONLAR ────────────────────────────────────

def _safe_name(s):
    return re.sub(r'[:\\/?*\[\]]', '', str(s))[:28]

def _write_ozet_row(ws, snap, row=None):
    kur = float(snap.get("usdTry") or 0)
    is_header_row = (row is None)

    if is_header_row:
        # İlk kez çağrıldığında başlık + veri
        headers = ["Ürün Adı","Tarih","Mod","Baskı Tipi","USD/TRY",
                   "Ürün Eni","Ürün Boyu","Sipariş Adedi",
                   "Hammadde ($)","Baskı ($)","Üretim ($)","Toplam ($)","Toplam (₺)"]
        apply_row(ws, 1, headers, bold=True, bg=NAVY)
        for ci, w in enumerate([22,18,8,12,10,10,10,12,13,13,13,13,14], 1):
            ws.column_dimensions[chr(64+ci)].width = w
        row = 2

    toplam_usd = parse_usd(snap.get("maliyetler", {}).get("toplam"))
    data = [
        snap.get("ad",""),
        snap.get("tarih",""),
        "Metre" if snap.get("mode") == "metre" else "KG",
        snap.get("baskiDetay", {}).get("tip", "Yok") if snap.get("baskiDetay") else "Yok",
        snap.get("usdTry",""),
        snap.get("urunEn",""),
        snap.get("urunBoy",""),
        snap.get("sipAdet",""),
        parse_usd(snap.get("maliyetler",{}).get("kumas")),
        parse_usd(snap.get("maliyetler",{}).get("baski")),
        parse_usd(snap.get("maliyetler",{}).get("uretim")),
        toplam_usd,
        round(toplam_usd * kur, 2) if kur else "",
    ]
    apply_row(ws, row, data, right_cols=[9,10,11,12,13],
              num_fmts={9:"0.0000",10:"0.0000",11:"0.0000",12:"0.0000",13:"#,##0.00"})

def _write_detay(ws, snap):
    ws.column_dimensions["A"].width = 36
    ws.column_dimensions["B"].width = 18
    ws.column_dimensions["C"].width = 18

    kur     = float(snap.get("usdTry") or 0)
    mode    = snap.get("mode","metre")
    bd      = snap.get("baskiDetay")
    is_dtf  = bd and bd.get("tip") == "DTF"

    r = [0]
    def wr(vals, bold=False, bg=None, right_cols=None, num_fmts=None):
        r[0] += 1
        apply_row(ws, r[0], vals, bold=bold, bg=bg,
                  right_cols=right_cols, num_fmts=num_fmts)
        return r[0]

    def section(title):
        wr([title], bold=True, bg=NAVY)

    def row2(label, usd_val, inc_try=True):
        try_val = round(usd_val * kur, 4) if (kur and inc_try and isinstance(usd_val, (int,float))) else ""
        wr([label, usd_val if usd_val != 0 else "", try_val],
           right_cols=[2,3], num_fmts={2:"0.0000", 3:"0.0000"})

    def plain(label, val):
        wr([label, val if val else ""])

    # Başlık
    ri = wr(["DEMFABRIKA — Ürün Maliyet Kartı"], bold=True, bg=NAVY)
    ws.merge_cells(f"A{ri}:C{ri}")
    ws.cell(ri, 1).alignment = Alignment(horizontal="center")

    wr(["Ürün",          snap.get("ad","")])
    wr(["Tarih",         snap.get("tarih","")])
    wr(["USD/TRY Kuru",  kur], right_cols=[2], num_fmts={2:"0.00"})

    r[0] += 1
    section("ÜRÜN BİLGİLERİ")
    plain("Ürün Eni (cm)",  snap.get("urunEn",""))
    plain("Ürün Boyu (cm)", snap.get("urunBoy",""))
    plain("Sipariş Adedi",  snap.get("sipAdet",""))

    r[0] += 1
    section("HAMMADDE")
    h = snap.get("hammadde") or {}
    plain("Ölçüm Modu", h.get("mod",""))
    if mode == "metre":
        row2("Metre Fiyatı ($)",       float(h.get("metreFiyat") or 0))
        plain("Kumaş Eni (cm)",        h.get("kumasEn",""))
        plain("1m Şeride Ürün Adedi",  h.get("urunAdet",""))
    else:
        row2("KG Fiyatı ($)",          float(h.get("kgFiyat") or 0))
        plain("Kumaş Eni (cm)",        h.get("kumasEn",""))
        plain("GSM (g/m²)",            h.get("gsm",""))
        plain("Metre/KG",              h.get("metreKg",""))
        plain("1m Şeride Ürün Adedi",  h.get("urunAdet",""))

    kumas_usd = parse_usd(snap.get("maliyetler",{}).get("kumas"))
    row2("Hammadde Maliyeti ($)", kumas_usd)
    kumas_row = r[0]

    r[0] += 1
    section("BASKI")
    baski_usd = parse_usd(snap.get("maliyetler",{}).get("baski"))

    if not bd:
        plain("Baskı", "Yok")
        row2("Baskı Maliyeti ($)", 0)
    elif bd.get("tip") == "Süblimasyon":
        plain("Baskı Tipi", "Süblimasyon")
        row2("Süblimasyon Fiyatı ($/m²)", float(bd.get("fiyat") or 0))
        plain("Baskı Adedi", bd.get("adet",""))
        row2("Baskı Maliyeti ($)", baski_usd)
    else:
        plain("Baskı Tipi", "DTF")
        plain("Referans Alan Eni (cm)",   bd.get("refEn",""))
        plain("Referans Alan Boyu (cm)",  bd.get("refBoy",""))
        row2("Referans Alan Fiyatı ($)",  float(bd.get("refFiyat") or 0))
        for i, b in enumerate(bd.get("bolgeler") or [], 1):
            plain(f"Baskı {i} - Eni (cm)",  b.get("en",""))
            plain(f"Baskı {i} - Boyu (cm)", b.get("boy",""))

        plain("Press - Günlük Mesai (dk)",       bd.get("pressMesai",""))
        plain("Press - Eleman Maaşı (₺/gün)",    bd.get("pressMaas",""))
        plain("Press - Yerleştirme Süresi (sn)",  bd.get("pressYerlestirme",""))
        plain("Press - Press Süresi (sn)",         bd.get("pressSure",""))
        plain("Press - Baskı Bölge Adedi",        len(bd.get("bolgeler") or []))

        # Hesaplanan ara değerler
        ref_alan   = float(bd.get("refEn") or 0) * float(bd.get("refBoy") or 0)
        birim_alan = float(bd.get("refFiyat") or 0) / ref_alan if ref_alan else 0
        dtf_only   = sum(birim_alan * (1 + float(b.get("en",0)) * float(b.get("boy",0)))
                         for b in (bd.get("bolgeler") or []))

        mesai  = float(bd.get("pressMesai") or 0)
        yrl    = float(bd.get("pressYerlestirme") or 0)
        sure   = float(bd.get("pressSure") or 0)
        maas   = float(bd.get("pressMaas") or 0)
        n_bol  = len(bd.get("bolgeler") or [])
        g_press = mesai * 60 / (yrl + sure) if (yrl + sure) > 0 else 0
        maas_usd = maas / kur if kur else 0
        press_tekil = maas_usd / g_press if g_press else 0
        press_top   = press_tekil * n_bol

        row2("DTF Baskı Maliyeti ($)",           round(dtf_only, 4))
        row2("Press Maliyeti ($)",                round(press_top, 4))
        row2("Birim Baskı Maliyeti ($)",          round(dtf_only + press_top, 4))
        row2("Birim Baskı Maliyeti (+%5 pay) ($)", round((dtf_only + press_top) * 1.05, 4))

    baski_row = r[0]

    r[0] += 1
    section("ÜRETİM MALİYETLERİ")
    wr(["Kalem", "Tutar ($)", "Tutar (₺)"], bold=True, bg=LIGHT, right_cols=[2,3])

    all_kalemler = list(snap.get("sabitKalemler") or []) + list(snap.get("ekKalemler") or [])
    for kl in all_kalemler:
        t = float(kl.get("tutar") or 0)
        wr([kl.get("ad",""), t, round(t * kur, 4) if kur else ""],
           right_cols=[2,3], num_fmts={2:"0.0000", 3:"0.0000"})

    uretim_usd = parse_usd(snap.get("maliyetler",{}).get("uretim"))
    wr(["Üretim Toplam ($)", uretim_usd, round(uretim_usd * kur, 2) if kur else ""],
       bold=True, right_cols=[2,3], num_fmts={2:"0.0000", 3:"#,##0.00"})
    uretim_row = r[0]

    r[0] += 1
    section("MALİYET ÖZETİ")
    wr(["", "Tutar ($)", "Tutar (₺)"], bold=True, bg=LIGHT, right_cols=[2,3])

    toplam_usd = parse_usd(snap.get("maliyetler",{}).get("toplam"))
    for label, usd in [("Hammadde", kumas_usd), ("Baskı", baski_usd), ("Üretim", uretim_usd)]:
        wr([label, usd, round(usd * kur, 2) if kur else ""],
           right_cols=[2,3], num_fmts={2:"0.0000", 3:"#,##0.00"})

    wr(["BİRİM MALİYET TOPLAM", toplam_usd, round(toplam_usd * kur, 2) if kur else ""],
       bold=True, bg=LIGHT, right_cols=[2,3],
       num_fmts={2:"0.0000", 3:"#,##0.00"})

def _write_fiyat_listesi(ws, snap):
    kur     = float(snap.get("usdTry") or 0)
    is_dtf  = snap.get("isDTF", False)
    sip     = int(snap.get("sipAdet") or 0)

    toplam_usd = parse_usd(snap.get("maliyetler",{}).get("toplam"))
    baski_usd  = parse_usd(snap.get("maliyetler",{}).get("baski"))
    urun_usd   = toplam_usd - baski_usd

    # Başlık
    ws.merge_cells("A1:F1")
    c = ws.cell(1, 1, "FİYAT LİSTESİ")
    c.font  = Font(name="Arial", bold=True, size=12, color=WHITE)
    c.fill  = PatternFill("solid", fgColor=NAVY)
    c.alignment = Alignment(horizontal="center")

    ws.cell(2, 1, snap.get("ad",""))
    ws.cell(2, 1).font = Font(name="Arial", bold=True, size=10)
    ws.cell(2, 3, f"USD/TRY: {snap.get('usdTry','')}")
    ws.cell(2, 3).font = Font(name="Arial", size=9, color="888888")

    headers = ["Adet","Kar Marjı","Birim Satış (USD)","Birim Satış (TL)","Toplam (USD)","Toplam (TL)"]
    apply_row(ws, 4, headers, bold=True, bg=NAVY, right_cols=[3,4,5,6])

    for ci, w in enumerate([12,10,18,18,16,16], 1):
        ws.column_dimensions[chr(64+ci)].width = w

    for ri, (adet, marj) in enumerate(MARJLAR, 5):
        bs  = (urun_usd  * 1.05 * (1 + marj)) + (baski_usd * 1.05 * (1 + marj))
        tot = bs * adet
        bg  = "FFFBEB" if (sip > 0 and adet <= sip) else "FFFFFF"

        row_data = [
            adet,
            f"{int(marj*100)}%",
            round(bs, 4),
            round(bs * kur, 2) if kur else "",
            round(tot, 2),
            round(tot * kur, 2) if kur else "",
        ]
        apply_row(ws, ri, row_data, right_cols=[2,3,4,5,6],
                  num_fmts={3:"0.0000", 4:"#,##0.00", 5:"#,##0.00", 6:"#,##0.00"})
        for ci in range(1, 7):
            c = ws.cell(ri, ci)
            c.fill = PatternFill("solid", fgColor=bg)
            if ci in (3, 4):
                c.font = Font(name="Arial", bold=True, size=10, color=GREEN)
            else:
                c.font = Font(name="Arial", bold=(ci > 2), size=10, color=NAVY)
