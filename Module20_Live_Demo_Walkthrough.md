# Module 20 — Live Demo Walkthrough

**Favorites · Swagger · Backend Architecture**  
Use this on a second screen while you demo. Code blocks match **this repo**. Callouts show where the slides differ.

---

## Repo ↔ slides quick map

| Slides say | We use |
|---|---|
| CommonJS `require` / `module.exports` | ESM `import` / `export default` |
| `server.js` | `index.js` |
| Port `3001` | Port **`9001`** |
| `middleware/auth.js` → `auth` | `middleware/auth.js` → **`protect`** |
| `req.user.userId` | **`req.user.id`** (JWT payload: `{ id }`) |
| `routes/auth.js` | `routes/authRoutes.js` |
| `routes/breweries.js` / `routes/favorites.js` | Same names (new files) |

**Base URL for all curl / Swagger demos:** `http://localhost:9001`

---

## Before you start (2 min)

```bash
# Terminal 1 — Mongo
npm run db

# Terminal 2 — API
npm run dev
```

Confirm:

- [ ] `MongoDB connected...`
- [ ] `Server running at http://localhost:9001`
- [ ] You have a test user (signup if needed):

```bash
curl -s -X POST http://localhost:9001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"name":"Pat","email":"pat@test.com","password":"password123"}'
```

**Talk track:** Module 19 left us with auth middleware + login. Today we add brewery proxy routes, a Favorites collection, Swagger docs, then talk architecture.

---

# Part 0 — Where we left off (Slide 2)

| Status | Item |
|---|---|
| ✅ | Auth middleware — `protect` reads Bearer token, verifies JWT, sets `req.user`, calls `next()` |
| ✅ | Login — `POST /api/auth/login` → bcrypt → `jwt.sign` → token |
| ✅ | React can send token (frontend `breweryApi.js` / localStorage) |
| 🔲 | Brewery proxy routes — do these **first** |
| 🔲 | Favorites model + protected routes |
| 🔲 | Swagger at `/api-docs` |

---

# DEMO 1 — Brewery proxy routes (Slides 3)

> Open routes — no auth. Anyone can search breweries.

### 1. Create `routes/breweries.js`

> **Slides:** `require` + `module.exports`  
> **We use:** ESM + native `fetch`

```js
import express from "express";

const router = express.Router();
const OBDB = "https://api.openbrewerydb.org/v1/breweries";

// GET /api/breweries?city=austin
router.get("/", async (req, res) => {
  try {
    const { city } = req.query;
    if (!city) {
      return res.status(400).json({ message: "city query param is required" });
    }

    const url = `${OBDB}?by_city=${encodeURIComponent(city)}`;
    console.log("Proxying →", url);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open Brewery DB responded ${response.status}`);
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch breweries" });
  }
});

// GET /api/breweries/:id
router.get("/:id", async (req, res) => {
  try {
    const url = `${OBDB}/${req.params.id}`;
    console.log("Proxying →", url);

    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).json({ message: "Brewery not found" });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch brewery" });
  }
});

export default router;
```

**Say aloud:** We don’t call Open Brewery DB from the browser anymore — the browser hits *our* API, we proxy. That keeps CORS, rate limits, and future caching on our side.

### 2. Register in `index.js`

Find the auth mount and add breweries next to it:

```js
import breweryRoutes from "./routes/breweries.js";

// ... existing middleware ...

app.use("/api/auth", authRoutes);
app.use("/api/breweries", breweryRoutes);
```

> **Slides:** `app.use('/api/breweries', require('./routes/breweries'))`  
> **We use:** ESM import + same mount path.

### 3. Test list by city

```bash
curl -s "http://localhost:9001/api/breweries?city=austin" | head -c 400
```

**Expect:** JSON array of breweries. Terminal should log `Proxying → https://api.openbrewerydb.org/...`

### 4. Test single brewery

Grab an `id` from the previous response, then:

```bash
curl -s "http://localhost:9001/api/breweries/<PASTE_ID_HERE>"
```

### 5–6. Frontend (if React project is open)

> Slides mention `breweryApi.js` → `BASE_URL = http://localhost:3001`  
> **For us:** `http://localhost:9001` and paths like `/api/breweries?city=...`

- [ ] Point frontend API base at `http://localhost:9001`
- [ ] Search in UI
- [ ] Network tab shows `localhost:9001`, **not** `openbrewerydb.org`

**Checkpoint:** Proxy works end-to-end before you touch Favorites.

---

# Talk — Where do favorites live? (Slide 4)

**Don’t code yet — draw / discuss.**

### Option A — Embed on User

```js
// User document
{
  email: "pat@test.com",
  favorites: ["b58f8e", "a3f2c1"]  // grows forever
}
```

| Pros | Cons |
|---|---|
| One read for all favorites | User doc grows unboundedly |
| No second query | Can’t ask “who favorited brewery X?” without scanning users |
| | Metadata (notes, savedAt) forces User schema changes |
| | 16MB document limit (rare, but real) |

### Option B — Separate `Favorite` collection ✅

```js
{
  userId: ObjectId,   // ref User
  breweryId: "b58f8e",
  createdAt: Date
}
```

| Pros | Cons |
|---|---|
| Separation of concerns | One extra query |
| Query by user **or** brewery | Slightly more setup |
| Easy to add metadata later | |
| Index `userId` for fast lookups | |

**Punchline:** *The one extra query is worth it.* We’re picking Option B.

---

# DEMO 2 — Favorites (Slides 5–7)

### 1. Create `models/Favorite.js`

> **Slides:** `req.user.userId` later in routes — our JWT uses **`id`**, so the model field is still `userId`, but we set it from `req.user.id`.

```js
import mongoose from "mongoose";

const favoriteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    breweryId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent the same user from saving the same brewery twice
favoriteSchema.index({ userId: 1, breweryId: 1 }, { unique: true });

export default mongoose.model("Favorite", favoriteSchema);
```

**Callouts while typing:**

- `ref: "User"` → enables `.populate("userId")` later
- `breweryId` is a **String** (Open Brewery DB IDs are strings)
- Compound unique index → Mongo rejects duplicates at the DB layer
- `timestamps: true` → free `createdAt` / `updatedAt`

### 2. Create `routes/favorites.js`

```js
import express from "express";
import { protect } from "../middleware/auth.js";
import Favorite from "../models/Favorite.js";

const router = express.Router();

// GET /api/favorites/me
router.get("/me", protect, async (req, res) => {
  const favs = await Favorite.find({ userId: req.user.id });
  res.json(favs);
});

// POST /api/favorites
router.post("/", protect, async (req, res) => {
  try {
    const fav = await Favorite.create({
      userId: req.user.id,
      breweryId: req.body.breweryId,
    });
    res.status(201).json(fav);
  } catch (err) {
    // Duplicate key from unique index
    if (err.code === 11000) {
      return res.status(409).json({ message: "Already favorited" });
    }
    console.error(err);
    res.status(500).json({ message: "Failed to save favorite" });
  }
});

// DELETE /api/favorites/:id
router.delete("/:id", protect, async (req, res) => {
  const deleted = await Favorite.findOneAndDelete({
    _id: req.params.id,
    userId: req.user.id, // own it — don't delete someone else's
  });

  if (!deleted) {
    return res.status(404).json({ message: "Favorite not found" });
  }

  res.json({ message: "Removed" });
});

export default router;
```

> **Slides:** `auth` middleware + `req.user.userId`  
> **We use:** `protect` + `req.user.id`

**Say aloud:**

- Every route gets `protect` → 401 before the handler if no/invalid token
- `findOneAndDelete` includes `userId` → even with a valid JWT, you only delete **your** row
- Unique index is the safety net for double-saves

### 3. Register in `index.js`

```js
import favoriteRoutes from "./routes/favorites.js";

app.use("/api/favorites", favoriteRoutes);
```

### 4. Login and copy the token

```bash
curl -s -X POST http://localhost:9001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"pat@test.com","password":"password123"}'
```

Copy `token` into a shell variable (easier for the next curls):

```bash
export TOKEN="paste_jwt_here"
```

### 5. POST a favorite

Use a real brewery `id` from Demo 1 if you have one; otherwise any string works for the DB demo:

```bash
curl -s -X POST http://localhost:9001/api/favorites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"breweryId":"b58f8e"}'
```

**Expect:** `201` + document with `_id`, `userId`, `breweryId`, timestamps.  
**Save the document `_id`** for the DELETE step.

### 6. GET my favorites

```bash
curl -s http://localhost:9001/api/favorites/me \
  -H "Authorization: Bearer $TOKEN"
```

### 7. DELETE that favorite

```bash
curl -s -X DELETE http://localhost:9001/api/favorites/<FAVORITE_DOC_ID> \
  -H "Authorization: Bearer $TOKEN"
```

**Expect:** `{ "message": "Removed" }`

### 8. Prove auth is enforced

```bash
curl -i -X DELETE http://localhost:9001/api/favorites/<FAVORITE_DOC_ID>
```

**Expect:** `401` — no token.

**Optional wow moment:** POST the same `breweryId` twice with a token → `409 Already favorited` (unique index).

---

# Part 2 — Swagger (Slides 8–13)

## Talk — Why docs matter (Slide 9) — 60 seconds

1. Nobody knows if it’s `?city=` or `?by_city=` without reading code  
2. Silent breaking changes when fields/status codes shift  
3. Onboarding hours → minutes  
4. FE/BE shared contract  

**Punchline:** Swagger gives an interactive UI at `/api-docs` — every route explorable in the browser.

---

# DEMO 3 — Add Swagger (Slides 10–13)

### 1. Install

```bash
npm install swagger-jsdoc swagger-ui-express
```

### 2–3. Config + mount in `index.js`

Add **before** `app.listen` (after routes is fine):

```js
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Brewery API",
      version: "1.0.0",
      description: "MERN stack brewery API",
    },
    // Helps "Try it out" hit the right host/port
    servers: [{ url: "http://localhost:9001" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js"], // scans JSDoc @openapi comments
};

const spec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));
```

> **Slides:** port 3001 implied  
> **We use:** `servers: [{ url: "http://localhost:9001" }]` so Try it out works.

**Say aloud:**

- `apis: ['./routes/*.js']` → new route files auto-appear  
- `bearerAuth` → lock icon on protected routes  
- Visit `/api-docs` — no Postman required for class demos

### 4. Annotate `routes/breweries.js`

Paste **above** `router.get("/")`:

```js
/**
 * @openapi
 * /api/breweries:
 *   get:
 *     summary: Search breweries by city
 *     tags: [Breweries]
 *     parameters:
 *       - in: query
 *         name: city
 *         required: true
 *         schema:
 *           type: string
 *         example: austin
 *     responses:
 *       200:
 *         description: Array of brewery objects
 *       400:
 *         description: Missing city query param
 *       500:
 *         description: Failed to fetch breweries
 */
```

Paste **above** `router.get("/:id")`:

```js
/**
 * @openapi
 * /api/breweries/{id}:
 *   get:
 *     summary: Get a single brewery by Open Brewery DB id
 *     tags: [Breweries]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Brewery object
 *       404:
 *         description: Brewery not found
 *       500:
 *         description: Failed to fetch brewery
 */
```

### 5. Annotate `routes/authRoutes.js`

Above `router.post("/login", ...)`:

```js
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Log in and receive a JWT
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 example: pat@test.com
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful — returns token
 *       401:
 *         description: Invalid credentials
 */
```

(Optional live) Add a similar block for `/api/auth/signup`.

### 6. Annotate `routes/favorites.js`

Above GET `/me`:

```js
/**
 * @openapi
 * /api/favorites/me:
 *   get:
 *     summary: List favorites for the logged-in user
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Array of favorite documents
 *       401:
 *         description: No token or invalid token
 */
```

Above POST `/`:

```js
/**
 * @openapi
 * /api/favorites:
 *   post:
 *     summary: Save a brewery as a favorite
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [breweryId]
 *             properties:
 *               breweryId:
 *                 type: string
 *                 example: b58f8e
 *     responses:
 *       201:
 *         description: Favorite created
 *       401:
 *         description: No token or invalid token
 *       409:
 *         description: Already favorited
 */
```

Above DELETE `/:id` (matches slide 12 closely):

```js
/**
 * @openapi
 * /api/favorites/{id}:
 *   delete:
 *     summary: Remove a saved favorite
 *     tags: [Favorites]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Favorite document _id
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Removed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Removed
 *       401:
 *         description: No token or invalid token
 *       404:
 *         description: Favorite not found
 */
```

### 7. Open the UI

Browser: [http://localhost:9001/api-docs](http://localhost:9001/api-docs)

Live clicks:

1. Expand **Auth → POST /login** → Try it out → Execute → copy `token`  
2. Click **Authorize** (top) → paste `Bearer <token>` or just the token  
3. Expand **Favorites → GET /me** → Execute  
4. Show lock icons on Favorites vs open Breweries

### 8. Scalability line

> Every new file under `routes/` that matches `apis: ['./routes/*.js']` shows up automatically. Docs grow with the codebase.

---

# Part 3 — Backend architecture (Slides 14–16)

## Talk only — no coding required

### Holy Grail layers (Slide 15)

```
Routes  →  Controllers  →  Services  →  Models
```

| Layer | Job | Example |
|---|---|---|
| **Routes** | Method + path + middleware. No business logic. | `router.post('/login', authCtrl.login)` |
| **Controllers** | Orchestrate: call service, shape `res.json`, map errors | `const token = await authService.login(...)` |
| **Services** | Business logic: DB, bcrypt, JWT, third-party fetch | `findUser → compare → sign` |
| **Models** | Schema, validation, indexes only | `User`, `Favorite` |

**Punchline:** A route shouldn’t query the DB. A model shouldn’t sign JWTs.

**Honest classroom note:** Our app today is still “fat routes” (logic in `authRoutes.js`, `favorites.js`). That’s fine for learning. The layers are the *direction of travel* as the project grows.

### Other patterns (Slide 16) — keep short

| Pattern | When |
|---|---|
| **MVC** | Smaller apps; Rails/Django muscle memory |
| **Feature folders** (`auth/`, `favorites/`) | Teams owning features at scale |
| **DDD / monorepo** | Enterprise / many services — not this project |

**Principle behind all of them:** Separate things that change for different reasons (URL vs business rules vs data shape).

**Tease next module:** Redis caching on brewery search — last piece before “production-ready.”

---

# Close — Key takeaways (Slide 17)

1. **Separate Favorites collection** beats embedding — query both ways, room to grow  
2. **`userId` in every mutation query** — own-it at the DB filter (`req.user.id` for us)  
3. **Compound unique index** — Mongo blocks duplicate saves  
4. **swagger-jsdoc** scans `routes/*.js` — docs scale with files  
5. **Annotate** params, body, responses; `security: bearerAuth` for the lock + Try it out  
6. **Routes → Controllers → Services → Models** is one solid pattern; the principle matters more than the folder names  

**Next:** Redis — cache brewery search results to cut third-party calls.

---

## Demo timing cheat sheet

| Block | Time | What you do |
|---|---|---|
| Where we left off | 2 min | Slide 2 checklist |
| Demo 1 — proxy | 8–10 min | `breweries.js` → mount → curl → (optional) Network tab |
| Favorites design talk | 4 min | Embed vs collection |
| Demo 2 — favorites | 10–12 min | model → routes → mount → login → POST/GET/DELETE/401 |
| Why Swagger | 2 min | Slide 9 |
| Demo 3 — Swagger | 10–12 min | install → config → annotate → `/api-docs` Try it out |
| Architecture | 5–7 min | Layers + “fat routes today, layers as we grow” |
| Takeaways | 2 min | Six points + Redis tease |

**~45–50 min** with breathing room.

---

## If something breaks

| Symptom | Fix |
|---|---|
| `Cannot find package 'swagger-...'` | Re-run `npm install swagger-jsdoc swagger-ui-express` |
| `/api-docs` empty / missing routes | Restart nodemon; check `@openapi` spelling and YAML indentation |
| Favorites 401 with token | Header must be `Authorization: Bearer <token>` (space after Bearer) |
| Favorites empty after POST | Confirm you’re using `req.user.id` (not `userId`) — matches JWT `{ id }` |
| Duplicate POST errors oddly | Unique index — expect `11000` / our `409` handler |
| Proxy 400 | Remember **our** query param is `city` (we map to OBDB’s `by_city`) |
| Wrong port | Everything is **`9001`**, not 3001 |

---

## File checklist (end state)

```
brewery-finder-backend/
├── index.js                 # + brewery + favorites mounts + swagger
├── models/
│   ├── User.js              # (existing)
│   └── Favorite.js          # NEW
├── routes/
│   ├── authRoutes.js        # + @openapi on login
│   ├── breweries.js         # NEW + @openapi
│   └── favorites.js         # NEW + @openapi
└── middleware/auth.js       # unchanged (protect)
```
