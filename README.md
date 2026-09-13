# 🤝 SevaSetu – Smart Cooperative Service Platform

Book verified local service professionals (electrician, plumber, cleaner…), get the **best pro
auto-assigned** by distance + rating + availability, and **track them live on a map** — with
English/Hindi UI, skill verification by an admin, and a rating system that feeds back into ranking.

**Stack: Next.js (App Router, JavaScript) · React 19 · Tailwind CSS · MongoDB (Mongoose) · JWT**

---

## 1. Database – MongoDB + Mongoose

The app is fully MERN-style: all data lives in MongoDB and every query goes through Mongoose models.

```
src/db/
├── index.js            # connectDB() – cached Mongoose connection (+ dev fallback)
└── models/
    ├── User.js         # customers, workers, admins (role field)
    ├── Worker.js       # worker profile, availability, verification, ratings
    ├── Booking.js      # booking + live tracking state + denormalised rating
    └── Rating.js       # one rating per completed booking (feeds the ranking)
```

### Connection

`src/db/index.js` exports:

| Export                | What it does                                                                |
| --------------------- | --------------------------------------------------------------------------- |
| `connectDB()`         | Connects Mongoose to `DATABASE_URL` (cached, safe to call on every request) |
| `getDB()`             | Same but never throws — returns `{ ok, error }` for health checks           |
| `dbStatus()`          | `{ connected, usingFallback, error }`                                       |
| `toJson()`            | Converts a Mongoose doc into a plain object with `id` instead of `_id`      |
| `idOf()` / `sameId()` | Safe ObjectId ↔ string helpers (populated docs included)                    |

### No MongoDB installed? No problem

If `DATABASE_URL` is empty **or** not a `mongodb://` / `mongodb+srv://` string, the app starts a
**local in-memory MongoDB** automatically (`mongodb-memory-server`). This gives you a zero-config
dev/demo experience. Set a real Atlas URL in production and the fallback is never used.

---

## 2. Project structure

```
src/
├── app/
│   ├── api/                 # "server"  – REST API (route handlers)
│   │   ├── auth/            # signup, login, logout, me      (JWT cookie)
│   │   ├── workers/         # ranked search, workers/me (profile + availability)
│   │   ├── bookings/        # create (auto-assign), list, [id] (status/live location), rate
│   │   ├── admin/           # stats, verification approve/reject
│   │   ├── services/        # service catalogue
│   │   └── health/          # health check + auto seed
│   ├── page.js              # landing page
│   ├── login | signup
│   ├── workers/             # browse + search/filter/sort + map
│   ├── book/                # booking form + emergency button
│   ├── track/[id]/          # LIVE tracking map (Uber-like)
│   └── dashboard/           # customer | worker | admin dashboards
├── components/              # Navbar, MapView, UI atoms, Providers (auth + toast + i18n)
├── db/                      # Mongoose connection + models
├── hooks/useGeo.js          # browser geolocation
├── i18n/config.js           # English + Hindi (react-i18next)
└── lib/                     # auth (JWT), geo scoring, services, bookings, seed
```

---

## 3. Features

- **JWT auth with 3 roles** – customer / worker / admin, each with its own dashboard.
- **Smart worker assignment** – `score = distance(50) + rating(35) + availability(10) + experience(5)`.
  Sort manually by distance, rating, availability or price. Emergency bookings pick the nearest
  online pro and add a 25 % surge.
- **Live tracking** – status flow `Searching → Assigned → On the way → Completed`, worker marker
  moves on the Leaflet/OpenStreetMap map, ETA + distance, worker can push real GPS (`watchPosition`).
- **Skill verification** – worker uploads a profile photo (compressed to a data-URL) and a skill
  video link; admin approves/rejects; a ✓ Verified badge is shown and only approved workers are
  auto-assigned.
- **Booking system** – service, date/time, address, notes, preferred worker, 🚨 emergency button.
- **Multi-language** – English + Hindi via react-i18next, toggle in the navbar (saved in localStorage).
- **Rating system** – 1–5 stars + comment after completion; updates the worker's average and ranking.
- **Extras** – loading spinners, toast notifications (react-hot-toast), online/offline toggle,
  admin stats + per-service chart, booking history with filters, search, fully responsive UI.

---

## 4. Local setup

```bash
npm install
cp .env.example .env       # DATABASE_URL can stay empty for the in-memory dev DB
npm run dev                # http://localhost:3000
```

To use your own MongoDB, set one of these in `.env`:

```bash
DATABASE_URL=mongodb+srv://user:password@cluster.mongodb.net/sevasetu
# or MONGO_URI / MONGODB_URI – both are accepted
```

Demo data (15 workers + 1 admin + 1 customer around New Delhi) is seeded automatically the first
time the API is hit.

### Demo accounts (password: `password123`)

| Role     | Email                |
| -------- | -------------------- |
| Customer | customer@sevasetu.in |
| Worker   | worker1@sevasetu.in  |
| Admin    | admin@sevasetu.in    |

> Tip for the demo: log in as the customer in one browser, book a service, then log in as the
> assigned worker in a private window, open the same job and press **Start trip** → watch the
> marker move on the customer's screen.

---

## 5. API reference

| Method    | Route                                                  | Description                                                                                   |
| --------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| GET       | `/api/health`                                          | health check (connects Mongo, seeds demo data)                                                |
| POST      | `/api/auth/signup`                                     | create customer/worker/admin (worker profile included)                                        |
| POST      | `/api/auth/login`                                      | JWT cookie login                                                                              |
| POST      | `/api/auth/logout`                                     | clear cookie                                                                                  |
| GET       | `/api/auth/me`                                         | current session (user + worker profile)                                                       |
| GET       | `/api/services`                                        | service catalogue                                                                             |
| GET       | `/api/workers?service=&sort=&q=&lat=&lng=&onlineOnly=` | ranked worker search                                                                          |
| GET/PATCH | `/api/workers/me`                                      | worker profile, availability toggle, photo/video, location                                    |
| GET       | `/api/bookings`                                        | role-aware booking list                                                                       |
| POST      | `/api/bookings`                                        | create booking + **smart auto-assignment**                                                    |
| GET       | `/api/bookings/:id`                                    | booking detail (live positions)                                                               |
| PATCH     | `/api/bookings/:id`                                    | `{status}` \| `{action:"location",lat,lng}` \| `{action:"simulate"}` \| `{action:"reassign"}` |
| POST      | `/api/bookings/:id/rate`                               | `{stars, comment}` → updates worker ranking                                                   |
| GET       | `/api/admin/stats`                                     | platform stats (Mongoose aggregations)                                                        |
| GET       | `/api/admin/workers`                                   | all workers incl. pending                                                                     |
| PATCH     | `/api/admin/workers/:id`                               | `{verification:"approved"\|"rejected"}`                                                       |

---

## 6. Deploying to Render

1. Create a free cluster on **MongoDB Atlas** → _Database Access_ (user) → _Network Access_
   (allow `0.0.0.0/0` for Render) → copy the connection string.
2. Push this repo to GitHub.
3. Render → **New → Web Service** → connect the repo:
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`
   - Environment variables:
     ```
     DATABASE_URL = mongodb+srv://yadavsumit62436_db_user:fbyGF4ljoSn9gFO8@cluster.mongodb.net/sevasetu
     JWT_SECRET   = <a long random string>
     CLIENT_URL   = https://your-app.onrender.com
     NODE_VERSION = 20
     ```
4. Deploy. Open `https://your-app.onrender.com/api/health` — it should return
   `{"status":"ok","db":true,"driver":"mongoose"}` and seed the demo data.

> Because the frontend and API share one origin, **no CORS configuration is needed**. If you split
> them later, allow `CLIENT_URL` in the API response headers.

---

## 7. Scripts

```bash
npm run dev      # development
npm run build    # production build
npm run start    # production server
npm run lint     # eslint
```
