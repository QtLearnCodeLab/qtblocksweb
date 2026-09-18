# QtBlocks Web

QtBlocks Web is the browser-based QtPi block-programming environment. The
canonical application lives in `app-nextjs` and exports as a static site.
Authentication, user roles, entitlements, and privileged services are owned by
QtPi Desktop Suite rather than this application.

## Development

```bash
cd app-nextjs
npm ci
npm run dev
```

Open `http://localhost:3000`.

## Static bundle

```bash
cd app-nextjs
npm ci
npm run build
```

The deployable static site is written to `app-nextjs/out`. Generated dependency
and build directories are ignored and must not be committed.

## Docker

The Docker image builds the same static bundle and serves it with nginx:

```bash
docker compose up --build
```

Open `http://localhost:8080`. Override the image name or host port with
`QTPI_QTBLOCKS_IMAGE` and `QTPI_QTBLOCKS_PORT`.

The nginx policy prevents stale HTML and stable-name Blockly assets after an
upgrade, while content-hashed Next.js assets remain cacheable.

## Desktop Suite integration

Desktop Suite may consume this repository as a Git submodule and package the
verified `app-nextjs/out` artifact as its offline bundled version. Docker is an
optional runtime using the same source build. Do not add NextAuth or application
credentials here; Desktop Suite supplies authenticated capabilities through its
restricted application bridge.
