# Lumana

This repository holds two independent projects: an Angular image search app with a polygon annotation editor, and a backend of two NestJS microservices plus a Go reporting service. They do not talk to each other, and each has its own dependencies and tooling.

## Demo

https://github.com/user-attachments/assets/e605d128-f7a4-41f4-8b9b-f966257e2454

## What is in the repo?

| Directory                        | What it does                                                         |
| -------------------------------- | -------------------------------------------------------------------- |
| `frontend`                       | Angular UI for Wikimedia Commons image search and polygon drawing |
| `backend/apps/service-a`         | Fetches NYC collision data to files, imports files, search           |
| `backend/apps/service-b`         | Consumes Service A events, stores and queries logs, PDF reports      |
| `backend/apps/report-service`    | Go gRPC service that reads RedisTimeSeries and renders the PDF       |
| `backend/libs`                   | Shared NestJS code: config, MongoDB, Redis, messaging, telemetry     |
| `backend/proto`                  | gRPC contract shared by Service B and the report service             |
| `backend/data`                   | Local directory used for generated exports                           |

The frontend searches [Wikimedia Commons](https://commons.wikimedia.org) directly. The backend works with the [NYC Open Data motor vehicle collisions](https://data.cityofnewyork.us/resource/h9gi-nx95.json) dataset, stored in MongoDB, with Redis used for event delivery and time-series metrics.

## Frontend

### Quick start

You need Node.js 22+ and npm 11+. No API key is required.

```bash
cd frontend
npm install
npm start          # http://localhost:4200
npm test           # unit tests (Vitest)
npm run build      # production build in dist/
```

### Using the app

Start typing in the search box. Search runs as you type, and featured images load when the query is empty. Results load in batches of 30, and more are fetched as you scroll. Past queries come back as suggestions, matched word by word in any order (`lake mou` finds `mountain lake`).

Click a result to open the image in a dialog and draw on it:

1. Click to add points.
2. Press Enter, double-click, or click the first point to close the shape.
3. Drag a polygon to move it, or drag the handle of the selected polygon to rotate it around its center.
4. Press Esc to cancel a drawing, or Backspace to remove the last point or the selected polygon.

Polygons are saved per image in the NgRx store and come back when the dialog is opened again. Points are stored relative to the image (0..1), so shapes keep their position at any size.

### Keyboard

| Key                | Search                     | Canvas                                              |
| ------------------ | -------------------------- | --------------------------------------------------- |
| ↑ / ↓              | Move through suggestions   | —                                                   |
| Enter              | Pick the active suggestion | Finish the polygon                                  |
| Backspace / Delete | —                          | Remove the last point, or the selected polygon      |
| Esc                | Close suggestions          | Cancel drawing or deselect; closes the dialog after |

### How it is built

Angular 22 standalone components with signals, NgRx 22 (store, effects, entity) and the Angular CDK.

- **Search** queries are normalized, debounced (300 ms) and deduplicated, and `switchMap` cancels stale requests. GET requests retry with exponential backoff on network, 429 and 5xx errors.
- **Caching**: results are cached in the store per query (5 min TTL, LRU limit of 50). Images are normalized into one entity collection, so an image shared by several queries is stored once.
- **Rendering**: CDK virtual scroll with a fixed row height, OnPush change detection, and lazy, async-decoded thumbnails with reserved size.
- **Pagination**: the next batch is requested when the rendered range gets within 10 rows of the end. `exhaustMap` prevents duplicate requests.
- **History** keeps only meaningful queries: ones that returned results, are at least 2 characters long, and are not intermediate typing steps.
- **Canvas**: during drag and rotation the canvas keeps a local preview and dispatches a single update on release, so the store is not flooded with actions.

```text
src/app
├── core                      HTTP layer: interceptors, constants, utils
├── shared                    search input with suggestions
└── features
    ├── image-search          search, results, history, suggestions, image dialog
    └── polygon-drawing       canvas editor used inside the image dialog
```

| Store slice    | Contents                                                                               |
| -------------- | -------------------------------------------------------------------------------------- |
| `imageSearch`  | Typed and active query, status, errors, image entities, cached searches keyed by query |
| `queryHistory` | Meaningful queries with search count and last search time, newest first                |
| `polygons`     | Polygons with image id, relative points, rotation and color                            |

## Backend

### Quick start with Docker

You only need Docker with Compose v2.

```bash
cd backend
docker compose up -d --build
```

Once the containers are ready, open:

- Service A API docs: <http://localhost:3001/docs>
- Service B API docs: <http://localhost:3002/docs>

The first build takes a little while because it builds the Go service as well as the Node services. Generated files appear in `backend/data/exports`. MongoDB and Redis use named Docker volumes, so their data survives `docker compose down`.

### Local development

Keep MongoDB, Redis and the report service in Docker and run the Node services on your machine:

```bash
cd backend
docker compose up -d mongo redis report-service
cp .env.example .env
npm ci && npm run build
PORT=3001 npm run start:a
PORT=3002 npm run start:b
```

Run the tests:

```bash
npm test
docker run --rm -v "$PWD/apps/report-service:/src" -w /src golang:1.27-alpine go test ./...
```

The second command runs the Go tests without a local Go install.

### API examples

#### Export collisions

```bash
curl -X POST localhost:3001/crashes/fetch \
  -H 'content-type: application/json' \
  -d '{"format":"xlsx","limit":100000}'
```

Use `"format":"json"` for a JSON file instead. Service A pages through the source API (50k rows per request, with retries) and streams rows to a `.partial` file that is renamed when complete. Excel files roll over to a new sheet before the row limit.

#### Import a file

```bash
curl -X POST localhost:3001/crashes/upload -F file=@data/exports/<file>.xlsx
```

JSON and `.xlsx` files are streamed and validated row by row; rejected rows are listed with row numbers and reasons. Rows are upserted by `collisionId`, so uploading the same file again never creates duplicates.

#### Search

```bash
curl 'localhost:3001/crashes/search?q=atl%20sed&limit=30'
```

Search matches word prefixes, newest first, with cursor pagination. Every page is served by an index seek.

#### Query activity logs

```bash
curl 'localhost:3002/logs?type=api.request&action=crashes.search&from=2026-10-08T00:00:00Z'
```

#### Generate a PDF report

```bash
curl -o report.pdf 'localhost:3002/reports/activity?from=2026-10-08T00:00:00Z'
```

The report covers the last 24 hours by default and at most 90 days. Page 1 has KPI cards (requests, error rate, average latency, rows imported) and request and error charts per action over time. Page 2 has latency by action, business events and a summary table.

### How the services fit together

```text
service-a ──► MongoDB (crashes)
    │
    ├──► RedisTimeSeries ◄── report-service (Go, gRPC) ◄── service-b /reports ──► PDF
    │
    └──► Redis Stream ──► service-b (consumer group) ──► MongoDB (logs)
```

Service A records every request, fetch and import in RedisTimeSeries and publishes an event to the `events:service-a` stream. Service B reads the stream with a consumer group and acknowledges events only after they are stored, so events published while it is down are processed when it starts. Logs are upserted by event id, so redelivery never creates duplicates. The Go service queries the time series, buckets the data for the requested period and renders the PDF.

### Configuration

`backend/.env.example` contains the local defaults:

- `PORT` for the service being started
- `MONGO_URI`, `MONGO_DB` and `REDIS_URL` for the databases
- `DATA_DIR` for generated exports
- `SOURCE_APP_TOKEN`, an optional NYC Open Data app token for higher rate limits
- `REPORT_GRPC_URL` for the connection from Service B to the Go service

Docker Compose supplies container hostnames automatically.

## A few practical notes

This is an assignment/demo project, so the endpoints have no authentication. Do not expose them publicly without adding authentication and authorization.
