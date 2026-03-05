from supabase import create_client, Client
from app.config import SUPABASE_URL, SUPABASE_KEY


def get_supabase_client() -> Client:
    """Create and return a Supabase client instance."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError(
            "Supabase credentials are not configured. "
            "Please set SUPABASE_URL and SUPABASE_KEY in your .env file."
        )
    return create_client(SUPABASE_URL, SUPABASE_KEY)
