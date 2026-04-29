from fastapi import FastAPI, HTTPException, Response, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import psycopg
from psycopg.rows import dict_row
import os, json, hashlib, secrets
from datetime import datetime, timedelta
from pydantic import BaseModel
from typing import Optional, Any
import jwt

app = FastAPI(title="DemFabrika Fiyat Hesaplayıcı")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── CONFIG ────────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "")
JWT_SECRET   = os.environ.get("JWT_SECRET", "demfabrika-secret-key-degistirin")
JWT_EXPIRE_HOURS = 24

# ── DATABASE ──────────────────────────────────────────────────
def get_conn():
    url = DATABASE_URL
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is not set!")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return psycopg.connect(url, row_factory=dict_row)

def init_db():
    with get_conn() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS kullanicilar (
                id         SERIAL PRIMARY KEY,
                ad         TEXT NOT NULL,
                email      TEXT UNIQUE NOT NULL,
                sifre_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS hesaplar (
                id           SERIAL PRIMARY KEY,
                ad           TEXT NOT NULL,
                tarih        TEXT NOT NULL,
                veri         JSONB NOT NULL,
                kullanici_id INTEGER,
                kullanici_ad TEXT,
                created_at   TIMESTAMPTZ DEFAULT NOW()
            )
        """)
        # Eski tabloya eksik kolonları ekle (varsa hata vermez)
        conn.execute("""
            ALTER TABLE hesaplar
            ADD COLUMN IF NOT EXISTS kullanici_id INTEGER,
            ADD COLUMN IF NOT EXISTS kullanici_ad TEXT
        """)
        conn.commit()

@app.on_event("startup")
def startup():
    init_db()

# ── AUTH HELPERS ──────────────────────────────────────────────
bearer = HTTPBearer()

def hash_sifre(sifre: str) -> str:
    return hashlib.sha256(sifre.encode()).hexdigest()

def token_olustur(kullanici_id: int, email: str, ad: str) -> str:
    payload = {
        "sub": kullanici_id,
        "email": email,
        "ad": ad,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def token_dogrula(credentials: HTTPAuthorizationCredentials = Depends(bearer)):
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token süresi doldu")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Geçersiz token")

# ── MODELS ────────────────────────────────────────────────────
class LoginBody(BaseModel):
    email: str
    sifre: str

class KullaniciOlustur(BaseModel):
    ad:    str
    email: str
    sifre: str

class HesapKaydet(BaseModel):
    ad:   str
    veri: Any

# ── AUTH ENDPOINTS ────────────────────────────────────────────
@app.post("/api/setup")
def setup(body: KullaniciOlustur):
    """İlk kullanıcıyı oluşturur. Kullanıcı varsa çalışmaz."""
    with get_conn() as conn:
        count = conn.execute("SELECT COUNT(*) as c FROM kullanicilar").fetchone()["c"]
        if count > 0:
            raise HTTPException(status_code=400, detail="Kullanıcılar zaten mevcut")
        conn.execute(
            "INSERT INTO kullanicilar (ad, email, sifre_hash) VALUES (%s, %s, %s)",
            (body.ad, body.email.lower(), hash_sifre(body.sifre))
        )
        conn.commit()
    return {"mesaj": f"{body.ad} oluşturuldu"}

@app.post("/api/login")
def login(body: LoginBody):
    with get_conn() as conn:
        user = conn.execute(
            "SELECT * FROM kullanicilar WHERE email = %s",
            (body.email.lower(),)
        ).fetchone()
    if not user or user["sifre_hash"] != hash_sifre(body.sifre):
        raise HTTPException(status_code=401, detail="E-posta veya şifre hatalı")
    token = token_olustur(user["id"], user["email"], user["ad"])
    return {"token": token, "ad": user["ad"], "email": user["email"]}

@app.get("/api/me")
def me(kullanici = Depends(token_dogrula)):
    return kullanici

@app.post("/api/kullanicilar")
def kullanici_ekle(body: KullaniciOlustur, kullanici = Depends(token_dogrula)):
    """Giriş yapmış herhangi biri yeni kullanıcı ekleyebilir."""
    with get_conn() as conn:
        try:
            conn.execute(
                "INSERT INTO kullanicilar (ad, email, sifre_hash) VALUES (%s, %s, %s)",
                (body.ad, body.email.lower(), hash_sifre(body.sifre))
            )
            conn.commit()
        except psycopg.errors.UniqueViolation:
            raise HTTPException(status_code=400, detail="Bu e-posta zaten kayıtlı")
    return {"mesaj": f"{body.ad} oluşturuldu"}

@app.get("/api/kullanicilar")
def kullanici_listele(kullanici = Depends(token_dogrula)):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, ad, email, created_at FROM kullanicilar ORDER BY created_at"
        ).fetchall()
    return [dict(r) for r in rows]

# ── HESAP ENDPOINTS (auth gerekli) ───────────────────────────
@app.get("/api/hesaplar")
def hesap_listele(kullanici = Depends(token_dogrula)):
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT id, ad, tarih, kullanici_ad, created_at FROM hesaplar ORDER BY created_at DESC"
        ).fetchall()
    return [dict(r) for r in rows]

@app.get("/api/hesaplar/{hesap_id}")
def hesap_getir(hesap_id: int, kullanici = Depends(token_dogrula)):
    with get_conn() as conn:
        row = conn.execute(
            "SELECT * FROM hesaplar WHERE id = %s", (hesap_id,)
        ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı")
    return dict(row)

@app.post("/api/hesaplar", status_code=201)
def hesap_kaydet(body: HesapKaydet, kullanici = Depends(token_dogrula)):
    tarih = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
    from psycopg.types.json import Jsonb
    with get_conn() as conn:
        row = conn.execute(
            """INSERT INTO hesaplar (ad, tarih, veri, kullanici_id, kullanici_ad)
               VALUES (%s, %s, %s, %s, %s) RETURNING id""",
            (body.ad, tarih, Jsonb(body.veri),
             kullanici["sub"], kullanici["ad"])
        ).fetchone()
        conn.commit()
    return {"id": row["id"], "ad": body.ad, "tarih": tarih}

@app.delete("/api/hesaplar/{hesap_id}")
def hesap_sil(hesap_id: int, kullanici = Depends(token_dogrula)):
    with get_conn() as conn:
        row = conn.execute(
            "DELETE FROM hesaplar WHERE id = %s RETURNING id", (hesap_id,)
        ).fetchone()
        conn.commit()
    if not row:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı")
    return {"silindi": hesap_id}

@app.get("/api/hesaplar/{hesap_id}/excel")
def excel_export(hesap_id: int, token: str = None, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))):
    # Bearer header veya ?token= query param
    raw = credentials.credentials if credentials else token
    if not raw:
        raise HTTPException(status_code=401, detail="Token gerekli")
    try:
        jwt.decode(raw, JWT_SECRET, algorithms=["HS256"])
    except:
        raise HTTPException(status_code=401, detail="Geçersiz token")

    with get_conn() as conn:
        row = conn.execute("SELECT * FROM hesaplar WHERE id = %s", (hesap_id,)).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı")
    snap = row["veri"]
    from excel_builder import build_wb
    import tempfile
    wb = build_wb(snap)
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        wb.save(tmp.name); tmp_path = tmp.name
    safe_name = snap.get("ad","hesap").replace(" ","_")
    with open(tmp_path, "rb") as f: content = f.read()
    os.unlink(tmp_path)
    return Response(content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="DemFabrika_{safe_name}.xlsx"'})

@app.get("/api/export/excel/tumu")
def excel_export_tumu(token: str = None, credentials: HTTPAuthorizationCredentials = Depends(HTTPBearer(auto_error=False))):
    raw = credentials.credentials if credentials else token
    if not raw:
        raise HTTPException(status_code=401, detail="Token gerekli")
    try:
        jwt.decode(raw, JWT_SECRET, algorithms=["HS256"])
    except:
        raise HTTPException(status_code=401, detail="Geçersiz token")

    with get_conn() as conn:
        rows = conn.execute("SELECT veri FROM hesaplar ORDER BY created_at DESC").fetchall()
    if not rows:
        raise HTTPException(status_code=404, detail="Kayıtlı hesap yok")
    from excel_builder import build_wb_multi
    import tempfile
    wb = build_wb_multi([r["veri"] for r in rows])
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        wb.save(tmp.name); tmp_path = tmp.name
    with open(tmp_path, "rb") as f: content = f.read()
    os.unlink(tmp_path)
    from datetime import date
    fname = f"DemFabrika_{date.today().isoformat()}.xlsx"
    return Response(content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'})

# ── STATIC FILES ──────────────────────────────────────────────
frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

