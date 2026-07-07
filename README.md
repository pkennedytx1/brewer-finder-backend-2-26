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

## License

ISC
