# Nethsville Academy — Django Backend (Emerging Technology Demo)

Dalawang emerging technology:
1. **AI Progress Summary** — observations ng teacher → AI draft → teacher edit/approve → makikita na ng parent.
2. **QR Guardian Verification** — signed QR bawat guardian (may expiry, pwedeng i-revoke) → kiosk verify/deny → pickup log.

## Paano patakbuhin (Windows)

```
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Buksan: http://127.0.0.1:8000/

### Para sa totoong AI (opsyonal)
```
set ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
set ANTHROPIC_MODEL=claude-haiku-5-5
python manage.py runserver
```
- Walang key o pumalya ang tawag → **offline rule-based fallback** ang gagamitin. Naka-label ito sa screen na **"hindi AI"** (hindi ito ipinapakilalang AI).
- Ang first name lang ng bata ang ipinapadala sa AI.

## Pages
| URL | Ano |
|---|---|
| `/demo/summary/` | Teacher: observations → Generate AI → edit → Approve; may Parent View |
| `/demo/kiosk/` | Gate kiosk: scan QR (camera) o paste token; may pickup log |
| `/admin/` | Django admin (`python manage.py createsuperuser` muna) |

## API (JSON)
| Method | URL | Gamit |
|---|---|---|
| GET | `/api/students/` | Listahan ng students |
| GET/POST | `/api/students/<id>/observations/` | Observations (`{"note": "..."}`) |
| POST | `/api/students/<id>/summary/generate/` | Gumawa ng AI draft (`{"lang":"en"\|"tl"}`) |
| POST | `/api/summaries/<id>/approve/` | Teacher approval (`{"final_text": "..."}`) |
| GET | `/api/students/<id>/parent-view/` | Approved summaries lang |
| GET | `/api/guardians/` | Guardians + QR links |
| GET | `/api/guardians/<id>/qr.png` | QR image |
| POST | `/api/guardians/<id>/revoke-qr/` | Invalid na ang lumang QR |
| POST | `/api/pickup/verify/` | `{"token": "..."}` → verified / denied (403) |
| GET | `/api/pickup/log/` | Huling 20 scan |

### Gamitin sa HTML n'yo (Live Server, 127.0.0.1:5500)
Naka-enable na ang CORS para sa `http://127.0.0.1:5500` at `http://localhost:5500`.
```html
<script>
fetch('http://127.0.0.1:8000/api/students/1/summary/generate/', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({lang: 'en'})
}).then(r => r.json()).then(console.log);
</script>
```

## Paano gumagana ang QR security
- Ang laman ng QR ay **signed token** (Django `signing`), hindi basta ID. Hindi mapepeke nang walang `SECRET_KEY`.
- May **expiry** (`QR_MAX_AGE_SECONDS`, 7 araw).
- **Revoke:** pinapalitan ang `qr_nonce` ng guardian kaya invalid na ang lumang QR.
- Denied kapag: peke/expired, na-revoke, o deactivated ang guardian. Lahat ng scan ay naka-log.

## Test
```
python manage.py test
```
11 tests: AI fallback + approval flow, QR (valid, peke, expired, revoked, deactivated), CORS.

## Database
Default ay SQLite (walang setup). Para lumipat sa MySQL o PostgreSQL, palitan lang ang `DATABASES` sa `config/settings.py`, tapos `python manage.py migrate` at `python manage.py seed_demo`.

## Hindi pa kasama (limitasyon)
- **Walang login/authentication pa** at `csrf_exempt` ang POST endpoints (demo lang). Sa Progress 1 ito idadagdag.
- Ang totoong AI ay kailangan ng API key at internet.
- Ang camera scanner sa kiosk ay gumagamit ng `html5-qrcode` mula sa CDN, kaya kailangan ng internet. Walang internet? I-paste ang token.
- Walang SMS/email notification pa.
