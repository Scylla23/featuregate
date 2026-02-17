# Deployment Guide

## Architecture

```
┌─────────────────┐         ┌──────────────────────────────────────┐
│  GitHub Pages   │         │       GCP Cloud Run (single container)│
│                 │         │                                      │
│  packages/      │         │  ┌──────────┐     ┌──────────────┐  │
│  website/       │         │  │  Nginx   │────▶│ Express API  │  │
│  (static site)  │         │  │  :8080   │/api │   :4000      │  │
│                 │         │  │          │     │              │  │
│                 │         │  │ Dashboard│     │ packages/    │  │
│                 │         │  │ SPA on / │     │ server/      │  │
│                 │         │  └──────────┘     └──────────────┘  │
└─────────────────┘         │                        │     │      │
                            └────────────────────────┼─────┼──────┘
                                                     │     │
                                              MongoDB 7  Redis 7
                                             (Atlas)   (Memorystore)
```

- **Website** → GitHub Pages (static HTML/JS/CSS)
- **Dashboard + API Server** → GCP Cloud Run as a single container:
  - Nginx serves the dashboard SPA on `/` and proxies `/api` to Express on port 4000
  - Express connects to MongoDB and Redis

---

## Workflows

### 1. Deploy Website (`deploy-website.yml`)

**Triggers**: Push to `main` when `packages/website/**` changes, or manual dispatch

**What it does**: Builds the Vite static site and deploys to GitHub Pages.

### 2. Deploy Cloud Run (`deploy-cloud-run.yml`)

**Triggers**: Push to `main` when `packages/server/**`, `packages/dashboard/**`, `packages/evaluator/**`, or `deploy/**` changes, or manual dispatch

**What it does**: Builds a Docker image with Nginx + Node.js, pushes to Artifact Registry, and deploys to Cloud Run.

---

## Prerequisites

### GitHub Pages

1. Go to **Settings > Pages** in your GitHub repository
2. Set **Source** to **GitHub Actions** (not "Deploy from a branch")
3. No additional secrets are needed — Pages uses OIDC tokens automatically

### GCP Cloud Run

You need a GCP project with these services enabled:
- Cloud Run
- Artifact Registry
- Secret Manager
- IAM & Workload Identity Federation

---

## Required GitHub Secrets

Configure these in **Settings > Secrets and variables > Actions**:

| Secret | Description | Example |
|--------|-------------|---------|
| `GCP_PROJECT_ID` | Your GCP project ID | `my-project-123` |
| `GCP_REGION` | GCP region for Cloud Run and Artifact Registry | `us-central1` |
| `GCP_SERVICE_ACCOUNT` | Service account email for deployments | `github-actions@my-project-123.iam.gserviceaccount.com` |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | Full Workload Identity provider resource name | `projects/123/locations/global/workloadIdentityPools/github/providers/github-actions` |
| `CLOUD_RUN_SERVICE_NAME` | Name of the Cloud Run service | `featuregate` |

## Required GCP Secret Manager Secrets

These are mounted into the Cloud Run container at runtime:

| Secret | Description |
|--------|-------------|
| `MONGODB_URI` | MongoDB connection string (e.g., MongoDB Atlas) |
| `REDIS_URL` | Redis connection string (e.g., Memorystore) |
| `JWT_SECRET` | Secret key for signing JWT tokens |

---

## GCP Setup Instructions

### 1. Create an Artifact Registry Repository

```bash
gcloud artifacts repositories create featuregate \
  --repository-format=docker \
  --location=$GCP_REGION \
  --description="FeatureGate Docker images"
```

### 2. Create a Service Account

```bash
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions Deployer"
```

### 3. Grant IAM Roles

```bash
PROJECT_ID=$(gcloud config get-value project)
SA_EMAIL="github-actions@${PROJECT_ID}.iam.gserviceaccount.com"

# Cloud Run deployer
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.admin"

# Artifact Registry writer
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

# Service Account user (to act as the runtime service account)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

# Secret Manager accessor (for runtime secrets)
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/secretmanager.secretAccessor"
```

### 4. Set Up Workload Identity Federation

```bash
# Create the pool
gcloud iam workload-identity-pools create github \
  --location="global" \
  --display-name="GitHub Actions"

# Create the provider
gcloud iam workload-identity-pools providers create-oidc github-actions \
  --location="global" \
  --workload-identity-pool="github" \
  --display-name="GitHub Actions" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# Allow the GitHub repo to impersonate the service account
# Replace OWNER/REPO with your GitHub repository
gcloud iam service-accounts add-iam-policy-binding $SA_EMAIL \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')/locations/global/workloadIdentityPools/github/attribute.repository/OWNER/REPO"
```

The `GCP_WORKLOAD_IDENTITY_PROVIDER` secret value is:
```
projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/github/providers/github-actions
```

### 5. Create Secret Manager Secrets

```bash
echo -n "mongodb+srv://user:pass@cluster.mongodb.net/featuregate" | \
  gcloud secrets create MONGODB_URI --data-file=-

echo -n "redis://10.0.0.1:6379" | \
  gcloud secrets create REDIS_URL --data-file=-

echo -n "your-production-jwt-secret" | \
  gcloud secrets create JWT_SECRET --data-file=-
```

---

## Local Docker Testing

Build and run the combined image locally (requires MongoDB and Redis running):

```bash
# Start local databases
pnpm docker:up

# Build the image
docker build -f deploy/Dockerfile -t featuregate-local .

# Run it
docker run -p 8080:8080 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/featuregate \
  -e REDIS_URL=redis://host.docker.internal:6379 \
  -e JWT_SECRET=dev-secret \
  featuregate-local
```

Then verify:
- `http://localhost:8080` — Dashboard SPA loads
- `http://localhost:8080/health` — Returns `{ "status": "ok" }`
- `http://localhost:8080/api/v1/auth/login` — API responds

---

## Manual Deployment

Both workflows support manual triggering via `workflow_dispatch`:

1. Go to **Actions** tab in GitHub
2. Select the workflow (Deploy Website or Deploy to GCP Cloud Run)
3. Click **Run workflow** > select `main` branch > **Run workflow**

---

## Key Design Decisions

### PORT Handling in Cloud Run

Cloud Run injects a `PORT` env var (typically 8080) for the container to listen on. The Express server also reads `PORT`. To avoid conflicts:
- `deploy/start.sh` reads Cloud Run's `PORT` for Nginx
- Express is started with `PORT=4000` explicitly overridden
- Nginx listens on Cloud Run's port and proxies `/api` to `localhost:4000`

### SSE Support

The Nginx config disables buffering and caching for `/api/` requests so Server-Sent Events stream correctly. Cloud Run's default request timeout is 300s — for long-lived SSE connections, configure `--timeout=3600` on the Cloud Run service.

### Concurrency

- **Website workflow**: `cancel-in-progress: true` — new pushes cancel running deploys
- **Cloud Run workflow**: `cancel-in-progress: false` — deployments run to completion to avoid partial deploys
