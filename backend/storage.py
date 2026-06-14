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
        if not client.bucket_exists(BUCKET):
            client.make_bucket(BUCKET)
            print(f"Bucket '{BUCKET}' créé")
        else:
            print(f"Bucket '{BUCKET}' existe déjà")
    except S3Error as e:
        print(f"Erreur MinIO: {e}")

def upload_photo(file_data, filename, content_type="image/jpeg"):
    try:
        client.put_object(
            BUCKET,
            filename,
            file_data,
            length=-1,
            part_size=10*1024*1024,
            content_type=content_type
        )
        return f"{BUCKET}/{filename}"
    except S3Error as e:
        print(f"Erreur upload: {e}")
        return None
def supprimer_photo(path: str):
    try:
        filename = path.replace("photos/", "")
        client.remove_object("photos", filename)
    except:
        pass