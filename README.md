# Agency Dashboard — Frontend

Angular 21 (standalone + signals, zoneless) สำหรับแสดง Agency Dashboard

```bash
pnpm install
cp .env.example .env   # ครั้งแรก: ตั้ง API_HOST (default http://localhost:8080)
pnpm start        # http://localhost:4200, proxy /api → API_HOST
pnpm test --watch=false
pnpm build
```

หรือใช้ `Makefile` ที่เตรียมไว้: `make boot` (ติดตั้ง toolchain), `make init` (pre-commit + pnpm install),
`make dev`, `make build`, `make test`, `make check` (pre-commit run --all-files)

- Backend ต้องรันที่ port 8080 (ดู `../agency-api`)
- **Host ของ API ตั้งที่ `.env`** (`API_HOST`) — โค้ดยังเรียก relative `/api/...` เสมอ:
  - dev: `proxy.conf.mjs` อ่าน `.env` ด้วย **dotenv** (`scripts/api-host.mjs`) — พฤติกรรมเดียวกับ tgr-web-tripgator
  - override ชั่วคราวได้: `API_HOST=http://localhost:8081 pnpm start`
  - scheme ไม่ต้องใส่ก็ได้ (`api.example.com` → `http://api.example.com`)
- Docker/prod: nginx เป็น template (`nginx.conf.template`) ที่ถูก render ตอน container start
  ด้วย env `API_HOST` (ดู `docker-entrypoint.d/40-api-host.sh`) — เปลี่ยน host ได้โดยไม่ต้อง rebuild image
- Endpoint ที่ใช้:
  - `GET /api/v1/dashboard/stream` — SSE (`text/event-stream`), event ชื่อ `dashboard`; backend ส่ง snapshot ปัจจุบันทันทีที่ต่อ แล้ว push ทุกครั้งที่มีการ refresh
  - `POST /api/v1/dashboard/refresh` — ปุ่ม **New data** สั่ง backend สุ่มชุดใหม่ (ผลลัพธ์ถูก push มาทาง stream)
- Docker: `Dockerfile` + `nginx.conf` อยู่ในโฟลเดอร์นี้ (compose อยู่ที่ `../agency-docs/docker`)

## โครงสร้าง

```
src/app/
├─ app.config.ts / app.routes.ts     # HttpClient, route '' + route-level DashboardService
└─ dashboard/
   ├─ dashboard.models.ts            # types ตรงกับ JSON ของ backend
   ├─ dashboard.service.ts           # state (signals) + SSE + error handling (relative URLs)
   ├─ dashboard.stream.ts            # EventSource wrapper + injection token (testable)
   ├─ dashboard-page.*               # header, timestamp, loading/error states
   ├─ dashboard-table.*              # ตาราง 19 คอลัมน์ + sticky REGION + flash ช่องที่ค่าเปลี่ยน
   ├─ testing/fake-dashboard-stream.ts  # EventSource ปลอมสำหรับ unit test
   └─ *.spec.ts / dashboard.fixture.ts
```

รายละเอียดการออกแบบและเหตุผลดูที่ [README หลัก](../README.md)

## Deploy to S3 + CloudFront

`.github/workflows/deploy-web.yml` build แล้วอัปขึ้น S3 + invalidate CloudFront (ไม่ต้องมี server)

### GitHub Variables / Secrets

| name | ชนิด | ค่า |
|---|---|---|
| `AWS_REGION` | var | `ap-southeast-7` (ต้องตรงกับ region ของ bucket) |
| `S3_BUCKET` | var | ชื่อ bucket (ไม่ต้องมี `s3://`) |
| `CLOUDFRONT_DISTRIBUTION_ID` | var | ถ้าไม่ใส่ = ข้ามการ invalidate (ไม่แนะนำ) |
| `APP_URL` | var | ใช้โชว์ใน GitHub UI |
| `AWS_ROLE_ARN` | secret | OIDC role (แนะนำ) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | secret | ทางเลือกถ้ายังไม่ทำ OIDC |

สิทธิ์ที่ deploy role/user ต้องมี:
```
s3:ListBucket            → arn:aws:s3:::<bucket>
s3:PutObject             → arn:aws:s3:::<bucket>/*
s3:DeleteObject          → arn:aws:s3:::<bucket>/*
cloudfront:CreateInvalidation → arn:aws:cloudfront::<account>:distribution/<id>
```

> workflow ใช้ `aws s3 sync --delete` ที่ **root ของ bucket** — อย่าใช้ bucket ร่วมกับไฟล์อื่น
> เพราะไฟล์ที่ไม่อยู่ใน build จะถูกลบ

### Cache headers ที่ workflow ตั้งให้

| ไฟล์ | Cache-Control |
|---|---|
| `*.js`, `*.css` (มี content hash) | `public,max-age=31536000,immutable` |
| `index.html` | `no-cache` (ต้อง revalidate ทุกครั้ง) |
| ที่เหลือ (favicon ฯลฯ) | `public,max-age=3600` |

### สิ่งที่ต้องตั้งที่ CloudFront (สำคัญ)

1. **SPA fallback** — Custom error responses: `403` และ `404` → `/index.html`, response code `200`
   (S3 ไม่ rewrite path ให้; ถ้าไม่ตั้ง การ refresh ที่ path ลึก เช่น `/dashboard` จะได้ 404)
2. **`/api/*` behavior → ALB/API origin** เพื่อให้ relative `/api/...` ยังใช้ได้ (ไม่ต้องแก้โค้ด/ไม่ต้องมี CORS)
   - Cache policy: **CachingDisabled**
   - Origin request policy: **AllViewer** (ต้องส่ง `Accept` ผ่านไปให้ SSE)
   - **Compress: off** และ Origin response timeout ≥ 30s (heartbeat SSE คือ 20s)
   - ห้ามเปิด caching/invalidation ของ path นี้
3. Bucket ไม่ต้อง public — ใช้ **OAC** (Origin Access Control) ให้ CloudFront อ่านได้

### ตรวจหลัง deploy

```bash
curl -I https://<cloudfront-domain>/            # 200, index.html, cache-control: no-cache
curl -I https://<cloudfront-domain>/<asset>.js  # 200, immutable
curl -s https://<cloudfront-domain>/api/v1/health   # 200 envelope (ต้องผ่าน behavior /api/*)
```
