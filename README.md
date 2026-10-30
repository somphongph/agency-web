# Agency Dashboard — Frontend

Angular 21 (standalone + signals, zoneless) สำหรับแสดง Agency Dashboard

```bash
npm install
npm start        # http://localhost:4200, proxy /api → http://localhost:8080
npm test -- --watch=false
npm run build
```

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
