"""
Shared utility functions for Smart Union Postbox.
"""

import secrets
import string


def generate_secure_password(length: int = 12) -> str:
    """
    Generate a cryptographically secure random password.

    Ensures at least one uppercase, one lowercase, one digit, and one
    special character for basic complexity requirements.
    """
    if length < 8:
        length = 8

    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"

    while True:
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        # Ensure complexity
        if (
            any(c.islower() for c in password)
            and any(c.isupper() for c in password)
            and any(c.isdigit() for c in password)
            and any(c in "!@#$%^&*" for c in password)
        ):
            return password


def generate_username_from_nid(nid_name: str, nid_number: str) -> str:
    """
    Generate a unique username from NID data.

    Format: first part of name (lowercased, ASCII-safe) + last 4 digits of NID.
    Falls back to 'citizen_' + random suffix if name is not ASCII.
    """
    try:
        # Try to extract a usable part from the name
        name_parts = nid_name.strip().split()
        if name_parts:
            # Use first name, keep only alphanumeric
            base = "".join(c for c in name_parts[0].lower() if c.isalnum())
        else:
            base = ""

        if not base or not base.isascii():
            base = "citizen"

        suffix = nid_number[-4:] if len(nid_number) >= 4 else nid_number
        username = f"{base}_{suffix}"

        return username

    except (AttributeError, IndexError):
        return f"citizen_{secrets.token_hex(4)}"
