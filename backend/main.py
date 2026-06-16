from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse, RedirectResponse
from sqlalchemy.orm import Session
from typing import List, Annotated
from minio.error import S3Error
import database, models, storage, ai
import uuid, io, os

models.Base.metadata.create_all(bind=database.engine)
storage.init_bucket()

app = FastAPI(title="Pièces Auto API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "message": "Pièces Auto API opérationnelle"}

@app.get("/pieces")
def liste_pieces(db: Session = Depends(database.get_db)):
    return db.query(models.Piece).all()

@app.post("/upload")
async def upload_piece(
    file: UploadFile = File(...),
    db: Session = Depends(database.get_db)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Fichier doit être une image")

    image_bytes = await file.read()
    filename = f"{uuid.uuid4()}.jpg"
    path = storage.upload_photo(io.BytesIO(image_bytes), filename, file.content_type)
    if not path:
        raise HTTPException(status_code=500, detail="Erreur stockage photo")

    resultat = ai.analyser_photo(image_bytes)  # ✅ corrigé

    piece = models.Piece(
        photo_path=path,
        nom=resultat.get("nom"),
        categorie=resultat.get("categorie"),
        marque=resultat.get("marque"),
        reference=resultat.get("reference"),
        description=resultat.get("description"),
        prix_estime=resultat.get("prix_estime"),
        etat=resultat.get("etat"),
        analyse_ok=bool(resultat)
    )
    db.add(piece)
    db.commit()
    db.refresh(piece)

    return {"id": piece.id, "photo_path": piece.photo_path, "analyse": resultat}


@app.post("/upload-multiple")
async def upload_multiple(
    files: Annotated[List[UploadFile], File()],
    db: Session = Depends(database.get_db)
):
    resultats = []
    erreurs = []

    for file in files:
        try:
            if not file.content_type.startswith("image/"):
                erreurs.append({"fichier": file.filename, "erreur": "pas une image"})
                continue

            image_bytes = await file.read()
            filename = f"{uuid.uuid4()}.jpg"
            path = storage.upload_photo(io.BytesIO(image_bytes), filename, file.content_type)

            if not path:
                erreurs.append({"fichier": file.filename, "erreur": "erreur stockage"})
                continue

            resultat = ai.analyser_photo(image_bytes)  # ✅ corrigé

            piece = models.Piece(
                photo_path=path,
                nom=resultat.get("nom"),
                categorie=resultat.get("categorie"),
                marque=resultat.get("marque"),
                reference=resultat.get("reference"),
                description=resultat.get("description"),
                prix_estime=resultat.get("prix_estime"),
                etat=resultat.get("etat"),
                analyse_ok=bool(resultat)
            )
            db.add(piece)
            db.commit()
            db.refresh(piece)

            print(f"✅ {file.filename} → {resultat.get('nom', 'inconnu')}")
            resultats.append({
                "id": piece.id,
                "fichier": file.filename,
                "analyse": resultat
            })

        except Exception as e:
            print(f"❌ Erreur: {e}")
            erreurs.append({"fichier": file.filename, "erreur": str(e)})

    return {
        "total": len(files),
        "reussis": len(resultats),
        "echoues": len(erreurs),
        "resultats": resultats,
        "erreurs": erreurs
    }


@app.delete("/pieces/{piece_id}")
def supprimer_piece(piece_id: int, db: Session = Depends(database.get_db)):
    piece = db.query(models.Piece).filter(models.Piece.id == piece_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Pièce non trouvée")

    try:
        storage.supprimer_photo(piece.photo_path)
    except Exception as e:
        print(f"⚠️ Erreur suppression photo MinIO: {e}")

    db.delete(piece)
    db.commit()
    print(f"🗑️ Pièce #{piece_id} supprimée")
    return {"message": f"Pièce #{piece_id} supprimée avec succès"}


@app.get("/photo/{piece_id}")
def get_photo(piece_id: int, db: Session = Depends(database.get_db)):
    piece = db.query(models.Piece).filter(models.Piece.id == piece_id).first()
    if not piece:
        raise HTTPException(status_code=404, detail="Pièce introuvable")
    filename = piece.photo_path.split("/")[-1]
    bucket = os.getenv("MINIO_BUCKET", "photos")
    endpoint = os.getenv("MINIO_ENDPOINT", "")
    url = f"https://{endpoint}/file/{bucket}/{filename}"
    return RedirectResponse(url=url)