import base64

from cryptography.fernet import Fernet

from config.settings import settings

# Derive a valid Fernet key from the encryption key setting
_key = base64.urlsafe_b64encode(settings.encryption_key.encode()[:32].ljust(32, b"\0"))
_fernet = Fernet(_key)


def encrypt_token(token: str) -> str:
    return _fernet.encrypt(token.encode()).decode()


def decrypt_token(encrypted_token: str) -> str:
    return _fernet.decrypt(encrypted_token.encode()).decode()
