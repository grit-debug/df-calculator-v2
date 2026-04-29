from fastapi import FastAPI, HTTPException, Response, Depends, status, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
import os, json, hashlib, re
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional, Any
import jwt

app = FastAPI(title="DemFabrika Fiyat Hesaplayıcı")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

DATABASE_URL     = os.environ.get("DATABASE_URL", "")
JWT_SECRET       = os.environ.get("JWT_SECRET", "demfabrika-secret-key-degistirin")
JWT_EXPIRE_HOURS = 24

# ── DB ────────────────────────────────────────────────────────
def get_conn():
    url = DATABASE_URL
    if not url: raise RuntimeError("DATABASE_URL not set")
    if url.startswith("postgres://"): url = url.replace("postgres://", "postgresql://", 1)
    return psycopg.connect(url, row_factory=dict_row)

def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS kullanicilar (
                id SERIAL PRIMARY KEY, ad TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL, sifre_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS hesaplar (
                id SERIAL PRIMARY KEY, ad TEXT NOT NULL, tarih TEXT NOT NULL,
                veri JSONB NOT NULL, kullanici_id INTEGER, kullanici_ad TEXT,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        conn.execute("""
            ALTER TABLE hesaplar
            ADD COLUMN IF NOT EXISTS kullanici_id INTEGER,
            ADD COLUMN IF NOT EXISTS kullanici_ad TEXT
        """)
        # Ürünler tablosu — versiyon destekli
        conn.execute("""
            CREATE TABLE IF NOT EXISTS urunler (
                id           SERIAL PRIMARY KEY,
                urun_adi     TEXT NOT NULL,
                versiyon     INTEGER NOT NULL DEFAULT 1,
                tarih        TEXT NOT NULL,
                veri         JSONB NOT NULL,
                kullanici_id INTEGER,
                kullanici_ad TEXT,
                created_at   TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(urun_adi, versiyon)
            )
        """)
        conn.commit()

@app.on_event("startup")
def startup(): init_db()

# ── AUTH ──────────────────────────────────────────────────────
bearer = HTTPBearer()

def hash_sifre(s): return hashlib.sha256(s.encode()).hexdigest()

def token_olustur(uid, email, ad):
    return jwt.encode(
        {"sub": uid, "email": email, "ad": ad,
         "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)},
        JWT_SECRET, algorithm="HS256"
    )

def token_dogrula(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        return jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Geçersiz token")

def token_veya_query(token: str = Query(default=None),
                     credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))):
    raw = credentials.credentials if credentials else token
    if not raw: raise HTTPException(401, "Token gerekli")
    try:
        return jwt.decode(raw, JWT_SECRET, algorithms=["HS256"])
    except:
        raise HTTPException(401, "Geçersiz token")

# ── MODELS ────────────────────────────────────────────────────
class LoginBody(BaseModel):
    email: str; sifre: str

class KullaniciOlustur(BaseModel):
    ad: str; email: str; sifre: str

class HesapKaydet(BaseModel):
    ad: str; veri: Any

class UrunKaydet(BaseModel):
    urun_adi: str
    veri: Any

class UrunGuncelle(BaseModel):
    veri: Any

# ── AUTH ENDPOINTS ────────────────────────────────────────────
@app.post("/api/setup")
def setup(body: KullaniciOlustur):
    with get_conn() as conn:
        if conn.execute("SELECT COUNT(*) as c FROM kullanicilar").fetchone()["c"] > 0:
            raise HTTPException(400, "Kullanıcılar zaten mevcut")
        conn.execute("INSERT INTO kullanicilar (ad,email,sifre_hash) VALUES (%s,%s,%s)",
                     (body.ad, body.email.lower(), hash_sifre(body.sifre)))
        conn.commit()
    return {"mesaj": f"{body.ad} oluşturuldu"}

@app.post("/api/login")
def login(body: LoginBody):
    with get_conn() as conn:
        user = conn.execute("SELECT * FROM kullanicilar WHERE email=%s",
                            (body.email.lower(),)).fetchone()
    if not user or user["sifre_hash"] != hash_sifre(body.sifre):
        raise HTTPException(401, "E-posta veya şifre hatalı")
    return {"token": token_olustur(user["id"], user["email"], user["ad"]),
            "ad": user["ad"], "email": user["email"]}

@app.get("/api/me")
def me(k=Depends(token_dogrula)): return k

@app.post("/api/kullanicilar")
def kullanici_ekle(body: KullaniciOlustur, k=Depends(token_dogrula)):
    with get_conn() as conn:
        try:
            conn.execute("INSERT INTO kullanicilar (ad,email,sifre_hash) VALUES (%s,%s,%s)",
                         (body.ad, body.email.lower(), hash_sifre(body.sifre)))
            conn.commit()
        except psycopg.errors.UniqueViolation:
            raise HTTPException(400, "Bu e-posta zaten kayıtlı")
    return {"mesaj": f"{body.ad} oluşturuldu"}

@app.get("/api/kullanicilar")
def kullanici_listele(k=Depends(token_dogrula)):
    with get_conn() as conn:
        rows = conn.execute("SELECT id,ad,email,created_at FROM kullanicilar ORDER BY created_at").fetchall()
    return [dict(r) for r in rows]

# ── HESAP ENDPOINTS (geçmiş kayıtlar — korunuyor) ────────────
@app.get("/api/hesaplar")
def hesap_listele(k=Depends(token_dogrula)):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id,ad,tarih,kullanici_ad,created_at FROM hesaplar ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]

@app.get("/api/hesaplar/{hesap_id}")
def hesap_getir(hesap_id: int, k=Depends(token_dogrula)):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM hesaplar WHERE id=%s", (hesap_id,)).fetchone()
    if not row: raise HTTPException(404, "Hesap bulunamadı")
    return dict(row)

@app.post("/api/hesaplar", status_code=201)
def hesap_kaydet(body: HesapKaydet, k=Depends(token_dogrula)):
    tarih = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
    with get_conn() as conn:
        row = conn.execute(
            "INSERT INTO hesaplar (ad,tarih,veri,kullanici_id,kullanici_ad) VALUES (%s,%s,%s,%s,%s) RETURNING id",
            (body.ad, tarih, Jsonb(body.veri), k["sub"], k["ad"])
        ).fetchone()
        conn.commit()
    return {"id": row["id"], "ad": body.ad, "tarih": tarih}

@app.delete("/api/hesaplar/{hesap_id}")
def hesap_sil(hesap_id: int, k=Depends(token_dogrula)):
    with get_conn() as conn:
        row = conn.execute("DELETE FROM hesaplar WHERE id=%s RETURNING id", (hesap_id,)).fetchone()
        conn.commit()
    if not row: raise HTTPException(404, "Hesap bulunamadı")
    return {"silindi": hesap_id}

# ── ÜRÜN ENDPOINTS ────────────────────────────────────────────
@app.get("/api/urunler")
def urun_listele(ara: str = Query(None), k=Depends(token_dogrula)):
    """Tüm ürün adlarını döndürür (tekil, en son versiyon bilgisiyle)"""
    with get_conn() as conn:
        if ara:
            rows = conn.execute("""
                SELECT DISTINCT ON (urun_adi)
                    urun_adi, versiyon, tarih, kullanici_ad, id
                FROM urunler
                WHERE urun_adi ILIKE %s
                ORDER BY urun_adi, versiyon DESC
            """, (f"%{ara}%",)).fetchall()
        else:
            rows = conn.execute("""
                SELECT DISTINCT ON (urun_adi)
                    urun_adi, versiyon, tarih, kullanici_ad, id
                FROM urunler
                ORDER BY urun_adi, versiyon DESC
            """).fetchall()
    return [dict(r) for r in rows]

@app.get("/api/urunler/{urun_adi}/versiyonlar")
def urun_versiyonlari(urun_adi: str, k=Depends(token_dogrula)):
    """Bir ürünün tüm versiyonlarını listeler"""
    with get_conn() as conn:
        rows = conn.execute("""
            SELECT id, urun_adi, versiyon, tarih, kullanici_ad, created_at
            FROM urunler WHERE urun_adi=%s ORDER BY versiyon DESC
        """, (urun_adi,)).fetchall()
    if not rows: raise HTTPException(404, "Ürün bulunamadı")
    return [dict(r) for r in rows]

@app.get("/api/urunler/{urun_adi}/{versiyon}")
def urun_getir(urun_adi: str, versiyon: int, k=Depends(token_dogrula)):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM urunler WHERE urun_adi=%s AND versiyon=%s",
            (urun_adi, versiyon)
        ).fetchone()
    if not row: raise HTTPException(404, "Ürün/versiyon bulunamadı")
    return dict(row)

@app.post("/api/urunler", status_code=201)
def urun_kaydet(body: UrunKaydet, k=Depends(token_dogrula)):
    """Yeni ürün kaydeder. Aynı isim varsa yeni versiyon oluşturur."""
    tarih = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
    with get_conn() as conn:
        # Mevcut max versiyon
        existing = conn.execute(
            "SELECT MAX(versiyon) as max_v FROM urunler WHERE urun_adi=%s",
            (body.urun_adi,)
        ).fetchone()
        yeni_v = (existing["max_v"] or 0) + 1
        row = conn.execute("""
            INSERT INTO urunler (urun_adi, versiyon, tarih, veri, kullanici_id, kullanici_ad)
            VALUES (%s,%s,%s,%s,%s,%s) RETURNING id, versiyon
        """, (body.urun_adi, yeni_v, tarih, Jsonb(body.veri), k["sub"], k["ad"])).fetchone()
        conn.commit()
    return {"id": row["id"], "urun_adi": body.urun_adi,
            "versiyon": row["versiyon"], "tarih": tarih}

@app.put("/api/urunler/{urun_id}")
def urun_guncelle(urun_id: int, body: UrunGuncelle, k=Depends(token_dogrula)):
    """Mevcut bir versiyonun verisini güncelleyerek yeni versiyon oluşturur."""
    tarih = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
    with get_conn() as conn:
        mevcut = conn.execute("SELECT * FROM urunler WHERE id=%s", (urun_id,)).fetchone()
        if not mevcut: raise HTTPException(404, "Ürün bulunamadı")
        max_v = conn.execute(
            "SELECT MAX(versiyon) as max_v FROM urunler WHERE urun_adi=%s",
            (mevcut["urun_adi"],)
        ).fetchone()["max_v"]
        yeni_v = max_v + 1
        row = conn.execute("""
            INSERT INTO urunler (urun_adi, versiyon, tarih, veri, kullanici_id, kullanici_ad)
            VALUES (%s,%s,%s,%s,%s,%s) RETURNING id, versiyon
        """, (mevcut["urun_adi"], yeni_v, tarih, Jsonb(body.veri), k["sub"], k["ad"])).fetchone()
        conn.commit()
    return {"id": row["id"], "urun_adi": mevcut["urun_adi"],
            "versiyon": row["versiyon"], "tarih": tarih}

# ── EXCEL EXPORT ──────────────────────────────────────────────
def _excel_response(snap, safe_name):
    from excel_builder import build_wb
    import tempfile
    wb = build_wb(snap)
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        wb.save(tmp.name); tmp_path = tmp.name
    with open(tmp_path, "rb") as f: content = f.read()
    os.unlink(tmp_path)
    return Response(content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="DemFabrika_{safe_name}.xlsx"'})

@app.get("/api/hesaplar/{hesap_id}/excel")
def excel_hesap(hesap_id: int, k=Depends(token_veya_query)):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM hesaplar WHERE id=%s", (hesap_id,)).fetchone()
    if not row: raise HTTPException(404)
    return _excel_response(row["veri"], row["veri"].get("ad","hesap").replace(" ","_"))

@app.get("/api/urunler/{urun_id}/excel")
def excel_urun(urun_id: int, k=Depends(token_veya_query)):
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM urunler WHERE id=%s", (urun_id,)).fetchone()
    if not row: raise HTTPException(404)
    snap = row["veri"]
    safe = f"{row['urun_adi']}_v{row['versiyon']}".replace(" ","_")
    return _excel_response(snap, safe)

@app.get("/api/export/excel/tumu")
def excel_tumu(token: str = None,
               credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))):
    raw = credentials.credentials if credentials else token
    if not raw: raise HTTPException(401, "Token gerekli")
    try: jwt.decode(raw, JWT_SECRET, algorithms=["HS256"])
    except: raise HTTPException(401, "Geçersiz token")
    with get_conn() as conn:
        rows = conn.execute("SELECT veri FROM urunler ORDER BY urun_adi, versiyon").fetchall()
    if not rows: raise HTTPException(404, "Kayıtlı ürün yok")
    from excel_builder import build_wb_multi
    import tempfile
    wb = build_wb_multi([r["veri"] for r in rows])
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        wb.save(tmp.name); tmp_path = tmp.name
    with open(tmp_path, "rb") as f: content = f.read()
    os.unlink(tmp_path)
    from datetime import date
    return Response(content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="DemFabrika_{date.today().isoformat()}.xlsx"'})

# ── STATIC ────────────────────────────────────────────────────
from fastapi.responses import HTMLResponse
import re

# ── STATIC ────────────────────────────────────────────────────
frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")

@app.get("/app.js", include_in_schema=False)
def serve_appjs():
    """JS dosyasını tek parça olarak serve et"""
    filepath = os.path.join(frontend_dir, "app.js")
    with open(filepath, "rb") as f:
        content = f.read()
    return Response(content=content, media_type="application/javascript",
        headers={"Cache-Control": "no-store, no-cache", "Pragma": "no-cache"})

@app.get("/{filename:path}", include_in_schema=False)
def serve_static(filename: str):
    if not filename or filename == "/":
        filename = "index.html"
    filepath = os.path.join(frontend_dir, filename)
    if not os.path.isfile(filepath):
        filepath = os.path.join(frontend_dir, "index.html")
    with open(filepath, "rb") as f:
        content = f.read()
    ext = filename.rsplit(".", 1)[-1] if "." in filename else ""
    media_types = {"html": "text/html", "js": "application/javascript",
                   "css": "text/css", "json": "application/json"}
    media_type = media_types.get(ext, "application/octet-stream")
    return Response(content=content, media_type=media_type,
        headers={"Cache-Control": "no-store, no-cache", "Pragma": "no-cache"})
