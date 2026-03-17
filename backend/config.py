from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # GCP
    gcp_project_id: str = "visionqa"
    gcp_region: str = "us-central1"

    # Firestore
    firestore_database: str = "(default)"

    # Cloud Storage
    gcs_bucket: str = "visionqa-artifacts"

    # Gemini — supports both Vertex AI (ADC) and Gemini API Key
    gemini_model: str = "gemini-2.0-flash"
    gemini_vision_model: str = "gemini-2.0-flash"
    google_api_key: str = ""  # Set this to use Gemini API Key instead of Vertex AI
    use_vertex_ai: bool = False  # Auto-detected: True if no API key, False if API key set

    # Local development mode — uses in-memory DB + local file storage
    local_mode: bool = True  # Set to False for production GCP deployment

    # Auth
    jwt_secret: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expiry_hours: int = 24

    # CORS
    frontend_url: str = "http://localhost:3000"

    # Server
    host: str = "0.0.0.0"
    port: int = 8000

    model_config = {"env_file": ".env", "env_prefix": "VISIONQA_"}


settings = Settings()

# Auto-detect: use Vertex AI only when no API key is provided and not in local mode
if not settings.google_api_key and not settings.local_mode:
    settings.use_vertex_ai = True
