# Brewery Finder Backend

A Node.js and Express API for the Brewery Finder application. This server connects to MongoDB, exposes a JSON API, and serves a static frontend from the `public/` directory.

## Features

- **Express HTTP server** — REST-style API with JSON request/response handling
- **MongoDB integration** — Database connection via Mongoose, with Docker Compose for local development
- **Static file serving** — Serves the Brewery Finder landing page from `public/`
- **Environment-based configuration** — Port and database URI loaded from `.env`
- **Hot reload in development** — Nodemon watches for file changes during local work

## Tech Stack

| Layer        | Technology                          |
| ------------ | ----------------------------------- |
| Runtime      | Node.js (ES modules)                |
| Web framework| Express 4                           |
| Database     | MongoDB 7 (via Mongoose 8)          |
| Config       | dotenv                              |
| Dev tooling  | Nodemon, Docker Compose             |

## Project Structure

```
brewery-finder-backend/
├── db/
│   └── connect.js      # Mongoose connection helper
├── public/
│   └── index.html      # Static landing page
├── docker-compose.yml  # Local MongoDB container
├── index.js            # Express app entry point
├── package.json
└── .env                # Local environment variables (not committed)
```

## Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later recommended)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (for running MongoDB locally)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Create a `.env` file in the project root:

```env
PORT=9001
MONGODB_URI=mongodb://localhost:27017/brewery-finder
```

| Variable       | Description                                      | Default                                      |
| -------------- | ------------------------------------------------ | -------------------------------------------- |
| `PORT`         | HTTP port the server listens on                  | `9001`                                       |
| `MONGODB_URI`  | MongoDB connection string                        | `mongodb://localhost:27017/brewery-finder`   |

### 3. Start MongoDB

Run MongoDB in a Docker container:

```bash
npm run db
```

This starts a MongoDB 7 instance on port `27017` with a persistent volume (`mongodb_data`).

### 4. Start the server

**Development** (auto-restarts on file changes):

```bash
npm run dev
```

**Production**:

```bash
npm start
```

The server will be available at [http://localhost:9001](http://localhost:9001).

On startup, you should see:

```
MongoDB connected: localhost:27017/brewery-finder
Server running at http://localhost:9001
```

## API Endpoints

### `POST /api`

Accepts a JSON body and returns a confirmation response with the echoed payload.

**Request**

```bash
curl -X POST http://localhost:9001/api \
  -H "Content-Type: application/json" \
  -d '{"name": "Example Brewery", "city": "Austin"}'
```

**Response** (`200 OK`)

```json
{
  "message": "Hello from the Brewery Finder API",
  "sentBody": {
    "name": "Example Brewery",
    "city": "Austin"
  },
  "status": "ok"
}
```

### Static files

Any file in `public/` is served at the root URL. For example, [http://localhost:9001/](http://localhost:9001/) serves `public/index.html`.

## Available Scripts

| Script       | Command              | Description                              |
| ------------ | -------------------- | ---------------------------------------- |
| `start`      | `node index.js`      | Run the server                           |
| `dev`        | `nodemon index.js`   | Run with hot reload                      |
| `db`         | `docker compose up -d` | Start MongoDB in the background        |

## Stopping Services

Stop the Express server with `Ctrl+C`.

Stop the MongoDB container:

```bash
docker compose down
```

To remove the database volume as well:

```bash
docker compose down -v
```

## Troubleshooting

**MongoDB connection failed**

- Confirm Docker is running and the container is up: `docker ps`
- Start the database if needed: `npm run db`
- Verify `MONGODB_URI` in `.env` matches the Docker port (`27017`)

**Port already in use**

- Change `PORT` in `.env` to an unused port, or stop the process using port `9001`

## AWS Deployment (Module 24)

This repo deploys to **Amazon ECS** via GitHub Actions when you push a semver tag (e.g. `1.0.0`). The companion frontend repo (`brewery-finder-react-2-26`) deploys separately to S3.

**Deploy the backend first** — the frontend needs this API's URL before it can be built for production.

### GitHub Secrets (this repo)

Settings → Secrets and variables → Actions:

| Secret | Example | Notes |
|--------|---------|-------|
| `AWS_ACCESS_KEY_ID` | `AKIA...` | IAM user with ECR + ECS permissions |
| `AWS_SECRET_ACCESS_KEY` | `...` | |
| `AWS_REGION` | `us-east-1` | Same region as ECR/ECS |
| `ECR_REPOSITORY` | `brewery-finder-api` | ECR repo name only |
| `ECS_CLUSTER` | `brewery-finder-cluster` | ECS cluster name |
| `ECS_SERVICE` | `brewery-finder-api-service` | ECS service name |

### Database: MongoDB Atlas (AWS deploy)

This module uses **Atlas** for the deployed API — not a mongo container on ECS. Local dev still uses Docker mongo from `docker compose`.

| Environment | Database |
|-------------|----------|
| Local | `docker compose up -d` → `mongodb://localhost:27017/brewery-finder` |
| CI | Mongo service container in GitHub Actions |
| AWS (ECS) | Atlas connection string in `MONGODB_URI` |

**Atlas setup (free tier, ~5 min):**

1. Create a free **M0** cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. **Database Access** → database user + password.
3. **Network Access** → allow `0.0.0.0/0` (OK for a short-lived class demo).
4. **Connect** → copy `mongodb+srv://...` connection string.
5. Set on ECS task definition as `MONGODB_URI`.

Delete the Atlas cluster when the module ends — this stack is not meant to be long-lived.

### ECS task environment variables (AWS console)

These are **not** GitHub secrets — set them on the ECS task definition:

| Variable | Example | Purpose |
|----------|---------|---------|
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster....mongodb.net/brewery-finder` | MongoDB Atlas |
| `JWT_SECRET` | `your-production-secret` | Auth signing |
| `PORT` | `9001` | Container port |
| `FRONTEND_ORIGIN` | `http://your-bucket.s3-website-us-east-1.amazonaws.com` | CORS for the S3-hosted React app |

### One-time AWS setup (backend)

1. Create **MongoDB Atlas** cluster and copy connection string (above).
2. Create an **ECR** repository (name matches `ECR_REPOSITORY` secret).
3. Create an **ECS** cluster, task definition (single API container), and service behind an **Application Load Balancer**.
4. Point the task definition at your ECR image; expose port `9001`.
5. Set the four ECS env vars above (`MONGODB_URI` = Atlas string).

### Deploy this repo

```bash
git checkout module_24
git tag 1.0.0
git push origin module_24
git push origin 1.0.0
```

GitHub Actions will run tests, build the Docker image, push to ECR, and redeploy ECS.

### After deploy — copy the API URL

1. AWS console → **EC2 → Load Balancers** → copy the ALB **DNS name**.
2. Your API base URL is: `http://<alb-dns-name>/api`
3. Smoke test: `http://<alb-dns-name>/api/breweries?city=Austin`
4. Add that URL (with `/api`) as `VITE_API_BASE_URL` in the **frontend** repo's GitHub secrets.
5. Set `FRONTEND_ORIGIN` on the ECS task to the frontend S3 website URL (see frontend README).

### CI/CD workflow

| Trigger | What runs |
|---------|-----------|
| Push or PR to any branch | Unit + integration tests (MongoDB service container in CI) |
| Push tag `*.*.*` (e.g. `1.0.0`) | Tests → deploy to ECR/ECS |

Workflow file: `.github/workflows/ci.yml`

### New releases

```bash
git tag 1.0.1
git push origin 1.0.1
```

See `MODULE_24_WALKTHROUGH.md` in the parent `module_11` folder for the full instructor checklist and the frontend README for S3 setup.

### Tear down after the module

Delete to avoid ongoing charges:

- ECS service + cluster
- ECR images / repository
- S3 bucket
- Application Load Balancer (if not deleted with ECS)
- MongoDB Atlas cluster
- IAM access keys (GitHub secrets)

## License

ISC
