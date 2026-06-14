import requests
import base64
import json
import re
from PIL import Image
import io

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "llava:13b"

def analyser_piece(image_bytes: bytes) -> dict:
    try:
        image = Image.open(io.BytesIO(image_bytes))
        if image.mode in ("RGBA", "P", "LA"):
            image = image.convert("RGB")
        jpg_buffer = io.BytesIO()
        image.save(jpg_buffer, format="JPEG", quality=90)
        jpg_bytes = jpg_buffer.getvalue()
    except Exception as e:
        print(f"Erreur conversion image: {e}")
        return {}

    image_b64 = base64.b64encode(jpg_bytes).decode("utf-8")

    prompt = """Analyse cette photo de pièce automobile et retourne UNIQUEMENT un JSON valide, sans texte avant ou après, sans markdown.

Format attendu :
{
  "nom": "nom de la pièce en français",
  "categorie": "catégorie (Moteur, Freinage, Suspension, Électrique, Carrosserie, Transmission, Refroidissement, Autre)",
  "marque": "marque du véhicule compatible si visible, sinon null",
  "reference": "référence ou numéro de pièce si visible, sinon null",
  "prix_estime": null,
  "etat": "Neuf, Occasion, Reconditionné ou Inconnu",
  "description": "description courte de la pièce en 1-2 phrases"
}"""

    try:
        response = requests.post(OLLAMA_URL, json={
            "model": MODEL,
            "prompt": prompt,
            "images": [image_b64],
            "stream": False
        }, timeout=120)

        result = response.json()
        text = result.get("response", "").strip()
        print(f"✅ Réponse LLaVA: {text}")

        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```\s*", "", text).strip()

        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1 or end == 0:
            print("❌ Aucun JSON trouvé")
            return {}

        return json.loads(text[start:end])

    except json.JSONDecodeError as e:
        print(f"❌ Erreur parsing JSON: {e}")
        return {}
    except Exception as e:
        print(f"❌ Erreur LLaVA: {e}")
        return {}