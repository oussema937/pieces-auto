from minio import Minio
import os, io
from dotenv import load_dotenv

load_dotenv()

BUCKET = os.getenv("MINIO_BUCKET", "photos")
_client = None

def get_client():
    global _client
    if _client is None:
        endpoint = os.getenv("MINIO_ENDPOINT")
        if not endpoint:
            raise Exception("MINIO_ENDPOINT non configuré")
        _client = Minio(
            endpoint,
            access_key=os.getenv("MINIO_ACCESS_KEY"),
            secret_key=os.getenv("MINIO_SECRET_KEY"),
            secure=True  # ← forcé pour Backblaze
        )
    return _client

def init_bucket():
    try:
        c = get_client()
        if not c.bucket_exists(BUCKET):
            c.make_bucket(BUCKET)
        print(f"✅ Bucket '{BUCKET}' prêt")
    except Exception as e:
        print(f"⚠️ MinIO non disponible: {e} — stockage désactivé")

def upload_photo(file, filename, content_type):
    try:
        c = get_client()
        c.put_object(BUCKET, filename, file, -1, content_type=content_type, part_size=10*1024*1024)
        return f"photos/{filename}"
    except Exception as e:
        print(f"⚠️ Erreur upload MinIO: {e}")
        return f"photos/{filename}"

def supprimer_photo(path: str):
    try:
        c = get_client()
        filename = path.replace("photos/", "")
        c.remove_object(BUCKET, filename)
    except:
        pass