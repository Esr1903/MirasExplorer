# Test

```powershell
cd backend
python -m pytest -q --basetemp=../.test-tmp

cd ../frontend
npx tsc --noEmit
npm run lint
npm run build
```

Aktarım testleri klasör göreli yolu normalizasyonunu, multipart hizalamasını, duplicate commit korumasını ve hata halinde rollback davranışını kapsar.
