# Geliştirme kurulumu

PostgreSQL 15+ ve PostGIS 3+ çalışır durumda olmalıdır. Gerekli şemayı `database/schema/ana_ortak_kulturel_miras_veritabani.sql` ile kurun. `backend/.env` içinde `DATABASE_URL` tanımlayın.

Backend:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.txt
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Frontend:

```powershell
cd frontend
npm ci
npm run dev
```
