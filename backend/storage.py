from minio import Minio
from minio.error import S3Error
import os
from dotenv import load_dotenv

load_dotenv()

client = Minio(
    os.getenv("MINIO_ENDPOINT"),
    access_key=os.getenv("MINIO_ACCESS_KEY"),
    secret_key=os.getenv("MINIO_SECRET_KEY"),
    secure=False
)

BUCKET = os.getenv("MINIO_BUCKET", "photos")

def init_bucket():
    try:
        client = get_client()
        if not client.bucket_exists(BUCKET):
            client.make_bucket(BUCKET)
        print(f"✅ Bucket '{BUCKET}' prêt")
    except Exception as e:
        print(f"⚠️ MinIO non disponible: {e} — stockage désactivé")

def upload_photo(file, filename, content_type):
    try:
        client = get_client()
        client.put_object(BUCKET, filename, file, -1, content_type=content_type, part_size=10*1024*1024)
        return f"photos/{filename}"
    except Exception as e:
        print(f"⚠️ Erreur upload MinIO: {e}")
        return f"photos/{filename}"
def supprimer_photo(path: str):
    try:
        filename = path.replace("photos/", "")
        client.remove_object("photos", filename)
    except:
        pass