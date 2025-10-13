import os
import base64
import hashlib
from Crypto.Cipher import AES
from dotenv import load_dotenv

load_dotenv()

def decrypt_api_key(encrypted_api_key: str) -> str:
    """
    Decrypt the API key using AES decryption compatible with CryptoJS.
    """
    try:
        # Get encryption key from environment
        encryption_key = os.getenv("NEXT_PUBLIC_ENCRYPTION_KEY")
        
        # Decode from base64
        encrypted_bytes = base64.b64decode(encrypted_api_key)
        
        # Check for "Salted__" prefix
        if encrypted_bytes[:8] != b"Salted__":
            raise ValueError("Invalid encrypted data format")
        
        # Extract salt and ciphertext
        salt = encrypted_bytes[8:16]
        ciphertext = encrypted_bytes[16:]
        
        # Derive key and IV using MD5 (CryptoJS default)
        key_size = 32  # 256 bits
        iv_size = 16   # 128 bits
        derived = b""
        last_hash = b""
        
        while len(derived) < key_size + iv_size:
            last_hash = hashlib.md5(last_hash + encryption_key.encode('utf-8') + salt).digest()
            derived += last_hash
        
        key = derived[:key_size]
        iv = derived[key_size:key_size + iv_size]
        
        # Decrypt
        cipher = AES.new(key, AES.MODE_CBC, iv)
        decrypted_padded = cipher.decrypt(ciphertext)
        
        # Remove PKCS7 padding
        pad_len = decrypted_padded[-1]
        decrypted_text = decrypted_padded[:-pad_len].decode('utf-8')
        
        return decrypted_text
        
    except Exception as e:
        print(f"Error decrypting API key: {e}")
        raise Exception("Failed to decrypt API key")
  