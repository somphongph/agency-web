# Agency Dashboard — Frontend

Angular 21 (standalone + signals, zoneless) สำหรับแสดง Agency Dashboard

```bash
pnpm install
pnpm start        # http://localhost:4200, proxy /api → http://localhost:8080
pnpm test --watch=false
pnpm build
```

หรือใช้ `Makefile` ที่เตรียมไว้: `make boot` (ติดตั้ง toolchain), `make init` (pre-commit + pnpm install),
`make dev`, `make build`, `make test`, `make check` (pre-commit run --all-files)

- Backend ต้องรันที่ port 8080 (ดู `../agency-api`)
- Proxy config: `proxy.conf.json` (ผูกไว้ใน `angular.json` แล้ว)
- Endpoint ที่เรียก: `/api/v1/dashboard` ทุก 5 วินาที
- Docker: `Dockerfile` + `nginx.conf` อยู่ในโฟลเดอร์นี้ (compose อยู่ที่ `../agency-docs/docker`)

## โครงสร้าง

```
src/app/
├─ app.config.ts / app.routes.ts     # HttpClient, route '' + route-level DashboardService
└─ dashboard/
   ├─ dashboard.models.ts            # types ตรงกับ JSON ของ backend
   ├─ dashboard.service.ts           # state (signals) + polling + error handling
   ├─ dashboard-page.*               # header, timestamp, loading/error states
   ├─ dashboard-table.*              # ตาราง 19 คอลัมน์ + sticky REGION
   └─ *.spec.ts / dashboard.fixture.ts
```

รายละเอียดการออกแบบและเหตุผลดูที่ [README หลัก](../README.md)
