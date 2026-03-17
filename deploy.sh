#!/bin/bash
# VisionQA — Deploy to Google Cloud Run
# Usage: ./deploy.sh <project-id>

set -e

PROJECT_ID="${1:?Usage: ./deploy.sh <gcp-project-id>}"
REGION="us-central1"

echo "=== VisionQA Cloud Deployment ==="
echo "Project: $PROJECT_ID"
echo "Region:  $REGION"
echo ""

# Enable required APIs
echo "Enabling required GCP APIs..."
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  storage.googleapis.com \
  aiplatform.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  --project="$PROJECT_ID"

# Create Firestore database (if not exists)
echo "Creating Firestore database..."
gcloud firestore databases create \
  --location="$REGION" \
  --project="$PROJECT_ID" 2>/dev/null || echo "Firestore database already exists"

# Create Cloud Storage bucket (if not exists)
echo "Creating Cloud Storage bucket..."
gsutil mb -l "$REGION" -p "$PROJECT_ID" \
  "gs://${PROJECT_ID}-visionqa-artifacts" 2>/dev/null || echo "Bucket already exists"

# Build and deploy backend
echo ""
echo "=== Deploying Backend ==="
cd backend
gcloud builds submit \
  --tag "gcr.io/$PROJECT_ID/visionqa-backend" \
  --project="$PROJECT_ID"

gcloud run deploy visionqa-backend \
  --image="gcr.io/$PROJECT_ID/visionqa-backend" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=1Gi \
  --cpu=2 \
  --max-instances=10 \
  --min-instances=0 \
  --port=8000 \
  --timeout=600 \
  --set-env-vars="VISIONQA_GCP_PROJECT_ID=$PROJECT_ID,VISIONQA_GCP_REGION=$REGION,VISIONQA_GCS_BUCKET=${PROJECT_ID}-visionqa-artifacts" \
  --project="$PROJECT_ID"

BACKEND_URL=$(gcloud run services describe visionqa-backend \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(status.url)")
echo "Backend URL: $BACKEND_URL"
cd ..

# Build and deploy frontend
echo ""
echo "=== Deploying Frontend ==="
cd frontend
gcloud builds submit \
  --tag "gcr.io/$PROJECT_ID/visionqa-frontend" \
  --project="$PROJECT_ID"

gcloud run deploy visionqa-frontend \
  --image="gcr.io/$PROJECT_ID/visionqa-frontend" \
  --region="$REGION" \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=5 \
  --min-instances=0 \
  --port=3000 \
  --set-env-vars="NEXT_PUBLIC_API_URL=$BACKEND_URL" \
  --project="$PROJECT_ID"

FRONTEND_URL=$(gcloud run services describe visionqa-frontend \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --format="value(status.url)")
echo ""
echo "=== Deployment Complete ==="
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
echo "Health:   $BACKEND_URL/health"

# Update backend CORS with actual frontend URL
gcloud run services update visionqa-backend \
  --region="$REGION" \
  --project="$PROJECT_ID" \
  --set-env-vars="VISIONQA_GCP_PROJECT_ID=$PROJECT_ID,VISIONQA_GCP_REGION=$REGION,VISIONQA_GCS_BUCKET=${PROJECT_ID}-visionqa-artifacts,VISIONQA_FRONTEND_URL=$FRONTEND_URL"

echo ""
echo "Done! Open $FRONTEND_URL in your browser."
