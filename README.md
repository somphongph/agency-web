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
