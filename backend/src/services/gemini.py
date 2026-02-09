"""
Gemini AI client wrapper for OptiCV.
Handles all interactions with Google's Gemini API using structured outputs.
"""
import os
from google import genai
from google.genai import types
from pydantic import BaseModel


class GeminiClient:
    """Wrapper around Google Gemini API with structured output support."""
    
    def __init__(self, api_key: str | None = None):
        """Initialize Gemini client with API key from env or parameter."""
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        self.client = genai.Client(api_key=self.api_key)
        self.model = "gemini-2.5-flash"  # Fast, stable, great for structured output
    
    def generate_structured(
        self,
        prompt: str,
        response_schema: type[BaseModel],
        temperature: float = 0.7
    ) -> BaseModel:
        """
        Generate structured output using Gemini.
        
        Args:
            prompt: The prompt to send to Gemini
            response_schema: Pydantic model class defining expected output structure
            temperature: Creativity level (0.0 = deterministic, 1.0 = creative)
        
        Returns:
            Instance of response_schema with parsed data
        """
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(
                temperature=temperature,
                response_mime_type="application/json",
                response_schema=response_schema,
            ),
        )
        
        # Return parsed Pydantic model
        return response.parsed
    
    def generate_text(
        self,
        prompt: str,
        temperature: float = 0.7
    ) -> str:
        """
        Generate plain text response (for non-structured outputs).
        
        Args:
            prompt: The prompt to send
            temperature: Creativity level
        
        Returns:
            Generated text string
        """
        response = self.client.models.generate_content(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=temperature),
        )
        
        return response.text
    
    def generate_streaming(
        self,
        prompt: str,
        temperature: float = 0.7
    ):
        """
        Generate streaming text response (for chatbot).
        
        Args:
            prompt: The prompt to send
            temperature: Creativity level
        
        Yields:
            Text chunks as they're generated
        """
        response = self.client.models.generate_content_stream(
            model=self.model,
            contents=prompt,
            config=types.GenerateContentConfig(temperature=temperature),
        )
        
        for chunk in response:
            if chunk.text:
                yield chunk.text

    def embed_text(self, text: str) -> list[float] | None:
        """
        Generate an embedding vector for the provided text.
        Returns a list of floats or None if embeddings are unavailable.
        """
        try:
            # The exact embeddings API may vary; attempt the common call pattern
            emb_res = self.client.embeddings.create(model="embed_text_v1", input=[text])
            # SDKs differ in structure; handle common shapes
            if hasattr(emb_res, 'data') and len(emb_res.data) > 0:
                item = emb_res.data[0]
                if hasattr(item, 'embedding'):
                    return list(item.embedding)
                if hasattr(item, 'value'):
                    return list(item.value)
            # Fallback for other shapes
            if hasattr(emb_res, 'embeddings') and len(emb_res.embeddings) > 0:
                return list(emb_res.embeddings[0])
        except Exception:
            return None
        return None


# Singleton instance (lazy-loaded)
_client_instance: GeminiClient | None = None


def get_gemini_client() -> GeminiClient:
    """Get or create singleton Gemini client instance."""
    global _client_instance
    if _client_instance is None:
        _client_instance = GeminiClient()
    return _client_instance
