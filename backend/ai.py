import base64, json, re, io, os
from PIL import Image
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))

PROMPT = """Tu es un expert en pièces détachées automobiles.
Analyse cette photo et réponds UNIQUEMENT en JSON valide :
{
  "nom": "nom précis de la pièce en français",
  "categorie": "UNE valeur : Moteur, Freinage, Suspension, Électrique, Carrosserie, Transmission, Refroidissement, Intérieur, Autre",
  "marque": "marque si visible sinon null",
  "reference": null,
  "etat": "Neuf / Occasion / Inconnu",
  "description": "description précise en 1 phrase"
}"""

def analyser_photo(image_bytes: bytes) -> dict:
    try:
        img = Image.open(io.BytesIO(image_bytes))
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=85)
        b64 = base64.b64encode(buf.getvalue()).decode()

        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": PROMPT},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}"}}
                ]
            }],
            max_tokens=500
        )

        text = response.choices[0].message.content.strip()
        text = re.sub(r"```json\s*", "", text)
        text = re.sub(r"```\s*", "", text).strip()
        start = text.find("{")
        end = text.rfind("}") + 1
        if start == -1 or end == 0:
            return {}
        return json.loads(text[start:end])

    except Exception as e:
        print(f"❌ Erreur Groq: {e}")
        return {}