"""
Text formatting and normalization utilities for resumes.
"""
import re
from datetime import datetime


def normalize_whitespace(text: str) -> str:
    """Normalize whitespace: collapse multiple spaces/newlines."""
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def format_date(date_str: str) -> str:
    """
    Convert various date formats to MM/YYYY (ATS standard).
    
    Args:
        date_str: Date string in various formats
    
    Returns:
        Formatted date as MM/YYYY or original if parsing fails
    """
    # Already in MM/YYYY format
    if re.match(r'^\d{2}/\d{4}$', date_str):
        return date_str
    
    # Try parsing common formats
    formats = [
        "%Y-%m-%d",      # 2023-01-15
        "%m/%d/%Y",      # 01/15/2023
        "%B %Y",         # January 2023
        "%b %Y",         # Jan 2023
        "%Y",            # 2023
    ]
    
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%m/%Y")
        except ValueError:
            continue
    
    # If no format matched, return original
    return date_str


def clean_phone_number(phone: str) -> str:
    """Clean phone number: keep digits and basic formatting."""
    # Remove all non-digit characters except +, (, ), -
    cleaned = re.sub(r'[^\d\+\-\(\)\s]', '', phone)
    return cleaned.strip()


def extract_email(text: str) -> str | None:
    """Extract email address from text."""
    email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    match = re.search(email_pattern, text)
    return match.group(0) if match else None


def split_into_sentences(text: str) -> list[str]:
    """Split text into sentences for better formatting."""
    # Simple sentence splitter
    sentences = re.split(r'[.!?]+', text)
    return [s.strip() for s in sentences if s.strip()]


def truncate_text(text: str, max_length: int = 500, suffix: str = "...") -> str:
    """Truncate text to max length, adding suffix if truncated."""
    if len(text) <= max_length:
        return text
    return text[:max_length - len(suffix)].strip() + suffix

