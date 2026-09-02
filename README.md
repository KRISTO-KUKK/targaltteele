# Targalt Teele

Targalt Teele is a career and learning-path prototype for upper secondary school students. It helps connect a student's interests, skills, courses, study paths and possible careers into a clearer set of next steps.

The project was built during the AI Leap / Presidential Education Hackathon. Teachers and career specialists explained the domain needs and requirements; I translated those requirements into the technical implementation, built the prototype and handled deployment.

[Screenshot: student profile]
[Screenshot: recommendations view]
[Screenshot: plan comparison]

## Main Features

- Interest and skills input for building a student profile.
- Upload and free-text analysis flows for extracting useful profile signals.
- Course, curriculum and career recommendation views.
- Plan comparison for exploring different learning directions.
- Optional OpenAI integration for richer text analysis and recommendations.
- Local fallback analysis when no API key is configured.
- Browser localStorage persistence for prototype user state.
- Express API with a static production frontend build.
- `/api/health` endpoint for deployment health checks.

## Tech Stack

- React 19
- Vite 7
- TypeScript
- Express 5
- OpenAI API integration
- Local JSON datasets in `erialad/` and `valdkonnad/`
- Docker-ready Node.js production server

## My Role

I was the developer on the project. Domain experts, teachers and career specialists helped define what the tool needed to support, and I turned those requirements into the prototype application. I built the frontend, backend API, AI integration flow and deployment setup.

## Running Locally

Requirements:

- Node.js 22.12 or newer
- npm

```bash
npm install
cp .env.example .env
npm run dev
```

The Vite development server runs the frontend and the Express server together. The backend defaults to `http://localhost:8787`.

Production build check:

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Required | Description |
| --- | --- | --- |
| `PORT` | No | Express server port. Defaults to `8787`. |
| `NODE_ENV` | No | Use `production` in deployed environments. |
| `OPENAI_API_KEY` | No | Enables AI-based analysis and recommendations. |
| `OPENAI_MODEL` | No | OpenAI model name. Defaults to `gpt-4.1-mini`. |
| `OPENAI_TIMEOUT_MS` | No | Timeout for OpenAI requests. Defaults to `45000`. |
| `ALLOWED_ORIGIN` | No | Comma-separated CORS allowlist for deployed frontend origins. |
| `APP_BASE_PATH` | No | Optional server base path for subfolder deployments. Leave empty for normal domain or subdomain deployment. |
| `VITE_BASE_PATH` | No | Vite client base path. Defaults to `/`. |
| `VITE_API_BASE_PATH` | No | Optional API base path used by the browser client. |
| `CLIENT_DIST_DIR` | No | Path to the built frontend directory. Defaults to `dist/client`. |
| `LOG_LEVEL` | No | Set to `debug` for request-level logs. Defaults to quiet production logging. |

The application can run without `OPENAI_API_KEY`. In that mode, it uses local fallback logic so the prototype remains usable.

## Deployment

The repository includes a `Dockerfile` for Linux VPS deployment through Coolify or another Docker-based host.

Recommended Coolify settings:

- Build pack: Dockerfile
- Dockerfile location: `/Dockerfile`
- Exposed port: `8787`
- Health check path: `/api/health`
- Set environment variables in Coolify, not in the repository.

Example production variables:

```bash
NODE_ENV=production
PORT=8787
OPENAI_MODEL=gpt-4.1-mini
OPENAI_TIMEOUT_MS=45000
LOG_LEVEL=info
```

Add `OPENAI_API_KEY` only when AI analysis should be enabled. For a normal domain or subdomain deployment, keep `APP_BASE_PATH`, `VITE_BASE_PATH` and `VITE_API_BASE_PATH` at their defaults.

## Data and Persistence

The app uses local dataset folders committed in the repository and browser localStorage for prototype user state. It does not require a database. Uploaded file text extraction may create temporary files under `extracted-text/`; that directory is ignored by Git and should be treated as runtime data.

## Current Status

This is a polished hackathon prototype for demonstrating the product idea and implementation work. It is not a production counselling system, and its recommendations should be treated as exploratory guidance rather than official study or career advice.
