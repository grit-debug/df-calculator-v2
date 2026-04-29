# DemFabrika Fiyat Hesaplayıcı

## Railway Deploy Adımları

### 1. GitHub'a yükle
```bash
git init
git add .
git commit -m "ilk commit"
git branch -M main
git remote add origin https://github.com/KULLANICI_ADI/demfabrika.git
git push -u origin main
```

### 2. Railway'de PostgreSQL ekle
- Railway dashboard → New Project → Deploy from GitHub repo
- Repo'yu seç → Deploy
- Dashboard'da: **+ New** → **Database** → **PostgreSQL**
- PostgreSQL'in **DATABASE_URL** değişkenini kopyala

### 3. Environment variable ekle
Railway dashboard → Variables:
```
DATABASE_URL = postgresql://...  (PostgreSQL'den otomatik gelir)
```

### 4. Deploy tamamlandı
Railway size bir URL verecek, örn: `https://demfabrika-production.up.railway.app`

## Proje Yapısı
```
demfabrika/
├── backend/
│   ├── main.py          # FastAPI uygulama
│   ├── excel_builder.py # Excel export (openpyxl)
│   └── requirements.txt
├── frontend/
│   └── index.html       # Tek sayfalık uygulama
├── railway.toml
├── Procfile
└── README.md
```
