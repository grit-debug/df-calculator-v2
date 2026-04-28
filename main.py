from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import psycopg2, psycopg2.extras
import os, json
from datetime import datetime
from pydantic import BaseModel
from typing import Optional, Any

app = FastAPI(title="DemFabrika Fiyat Hesaplayıcı")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── DATABASE ──────────────────────────────────────────────────
DATABASE_URL = os.environ.get("DATABASE_URL", "")

def get_conn():
    url = DATABASE_URL
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql://", 1)
    return psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)

def init_db():
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS hesaplar (
            id         SERIAL PRIMARY KEY,
            ad         TEXT NOT NULL,
            tarih      TEXT NOT NULL,
            veri       JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    conn.commit()
    cur.close()
    conn.close()

@app.on_event("startup")
def startup():
    init_db()

# ── MODELS ────────────────────────────────────────────────────
class HesapKaydet(BaseModel):
    ad:   str
    veri: Any   # tüm snapshot JSON olarak

# ── API ───────────────────────────────────────────────────────
@app.get("/api/hesaplar")
def hesap_listele():
    conn = get_conn()
    cur  = conn.cursor()
    cur.execute("SELECT id, ad, tarih, created_at FROM hesaplar ORDER BY created_at DESC")
    rows = cur.fetchall()
    cur.close(); conn.close()
    return [dict(r) for r in rows]

@app.get("/api/hesaplar/{hesap_id}")
def hesap_getir(hesap_id: int):
    conn = get_conn()
    cur  = conn.cursor()
    cur.execute("SELECT * FROM hesaplar WHERE id = %s", (hesap_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı")
    return dict(row)

@app.post("/api/hesaplar", status_code=201)
def hesap_kaydet(body: HesapKaydet):
    conn = get_conn()
    cur  = conn.cursor()
    tarih = datetime.now().strftime("%d.%m.%Y %H:%M:%S")
    cur.execute(
        "INSERT INTO hesaplar (ad, tarih, veri) VALUES (%s, %s, %s) RETURNING id",
        (body.ad, tarih, json.dumps(body.veri, ensure_ascii=False))
    )
    new_id = cur.fetchone()["id"]
    conn.commit()
    cur.close(); conn.close()
    return {"id": new_id, "ad": body.ad, "tarih": tarih}

@app.delete("/api/hesaplar/{hesap_id}")
def hesap_sil(hesap_id: int):
    conn = get_conn()
    cur  = conn.cursor()
    cur.execute("DELETE FROM hesaplar WHERE id = %s RETURNING id", (hesap_id,))
    deleted = cur.fetchone()
    conn.commit()
    cur.close(); conn.close()
    if not deleted:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı")
    return {"silindi": hesap_id}

@app.get("/api/hesaplar/{hesap_id}/excel")
def excel_export(hesap_id: int):
    conn = get_conn()
    cur  = conn.cursor()
    cur.execute("SELECT * FROM hesaplar WHERE id = %s", (hesap_id,))
    row = cur.fetchone()
    cur.close(); conn.close()
    if not row:
        raise HTTPException(status_code=404, detail="Hesap bulunamadı")

    snap = row["veri"]
    from excel_builder import build_wb
    import tempfile, os
    wb = build_wb(snap)
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        wb.save(tmp.name)
        tmp_path = tmp.name

    safe_name = snap.get("ad","hesap").replace(" ","_")
    with open(tmp_path, "rb") as f:
        content = f.read()
    os.unlink(tmp_path)

    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="DemFabrika_{safe_name}.xlsx"'}
    )

@app.get("/api/export/excel/tumü")
def excel_export_tumu():
    conn = get_conn()
    cur  = conn.cursor()
    cur.execute("SELECT veri FROM hesaplar ORDER BY created_at DESC")
    rows = cur.fetchall()
    cur.close(); conn.close()
    if not rows:
        raise HTTPException(status_code=404, detail="Kayıtlı hesap yok")

    from excel_builder import build_wb_multi
    import tempfile, os
    wb = build_wb_multi([r["veri"] for r in rows])
    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as tmp:
        wb.save(tmp.name)
        tmp_path = tmp.name

    with open(tmp_path, "rb") as f:
        content = f.read()
    os.unlink(tmp_path)

    from datetime import date
    fname = f"DemFabrika_{date.today().isoformat()}.xlsx"
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'}
    )

# ── STATIC FILES (frontend) ───────────────────────────────────
frontend_dir = os.path.join(os.path.dirname(__file__), "frontend")
if os.path.isdir(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")
