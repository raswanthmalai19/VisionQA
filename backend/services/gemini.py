"""Gemini service — supports both Vertex AI (ADC) and Gemini API Key auth."""

from google import genai
from google.genai.types import Part, GenerateContentConfig

from backend.config import settings

_client: genai.Client | None = None


def get_gemini_client() -> genai.Client:
    global _client
    if _client is None:
        if settings.google_api_key:
            # Use Gemini API Key (simpler, no GCP project needed)
            _client = genai.Client(api_key=settings.google_api_key)
        elif settings.use_vertex_ai:
            # Use Vertex AI with Application Default Credentials
            _client = genai.Client(
                vertexai=True,
                project=settings.gcp_project_id,
                location=settings.gcp_region,
            )
        else:
            # Fallback: try API key from env, then Vertex AI
            import os
            api_key = os.environ.get("GOOGLE_API_KEY", "")
            if api_key:
                _client = genai.Client(api_key=api_key)
            else:
                _client = genai.Client(
                    vertexai=True,
                    project=settings.gcp_project_id,
                    location=settings.gcp_region,
                )
    return _client


async def analyze_screenshot(image_bytes: bytes, prompt: str) -> str:
    """Analyze a screenshot using Gemini Vision."""
    client = get_gemini_client()
    image_part = Part.from_bytes(data=image_bytes, mime_type="image/png")
    response = client.models.generate_content(
        model=settings.gemini_vision_model,
        contents=[prompt, image_part],
    )
    return response.text


async def generate_text(prompt: str, system_instruction: str | None = None) -> str:
    """Generate text using Gemini."""
    client = get_gemini_client()
    config = None
    if system_instruction:
        config = GenerateContentConfig(system_instruction=system_instruction)
    response = client.models.generate_content(
        model=settings.gemini_model,
        contents=prompt,
        config=config,
    )
    return response.text
