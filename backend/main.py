"""Decompile 3D backend.  Run: uvicorn main:app --reload --port 8000
Gemini = photo -> board JSON | Groq / Gemini (fallback OpenRouter) = AI tutor chat."""
import base64, io, json, os, re
from pathlib import Path
import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

try:
    from PIL import Image, ImageEnhance, ImageFilter, ImageOps
    HAS_PIL = True
except ImportError:
    HAS_PIL = False

HERE = Path(__file__).parent
# Load .env (pehle backend/.env, fir root/.env agar ho)
for env_path in (HERE / ".env", HERE.parent / ".env"):
    if env_path.exists():
        for ln in env_path.read_text(encoding="utf-8").splitlines():
            ln = ln.split("#")[0].strip()
            if "=" in ln:
                k, v = ln.split("=", 1)
                os.environ[k.strip()] = v.strip().strip('"').strip("'")

SAMPLE = json.loads((HERE / "sample.json").read_text(encoding="utf-8"))
GEMINI = "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent"
G_TEXT = ["gemini-3-flash-preview", "gemini-3.8-flash"]
GROQ = ("https://api.groq.com/openai/v1/chat/completions", ["llama-3.3-70b-versatile", "openai/gpt-oss-120b"])
OR = ("https://openrouter.ai/api/v1/chat/completions", ["openrouter/free"])
TYPES = {"usb_c", "inductor", "ic", "resistor", "capacitor", "cap_electrolytic", "diode", "led", "pad", "hole",
         "connector", "transistor", "crystal", "button", "antenna", "other"}

app = FastAPI(title="Decompile 3D")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
env = lambda n: os.getenv(n, "").strip()
models = lambda n, d: ([env(n)] if env(n) else []) + [x for x in d if x != env(n)]


async def call(url, headers, body_for, model_list):
    """Models ko order me try karo. (json, None) ya (None, error)."""
    err = "unknown"
    async with httpx.AsyncClient(timeout=180) as cl:
        for m in model_list:
            try:
                target_url = url.format(m) if "{}" in url else url
                r = await cl.post(target_url, headers=headers, json=body_for(m))
            except Exception as e:
                err = f"network: {e}"
                continue
            if r.status_code == 200:
                return r.json(), None
            err = f"{r.status_code} ({m}): {r.text[:250]}"
            if r.status_code in (401, 402, 403):
                break
    return None, err


def enhance_pcb_image(base64_str: str) -> tuple[str, str]:
    """
    Blurry, low-contrast, or tilted PCB photos ko auto-clean & sharpen karta hai:
    1. EXIF orientation correction (phone angle/tilt fix).
    2. Dynamic Range / Autocontrast (removes haze & bad lighting shadows).
    3. Unsharp Mask Filter (de-blurs printed component text & IC pins).
    4. Contrast & Sharpness boost so AI and user can see clear circuit details.
    """
    if not HAS_PIL:
        return base64_str, "image/jpeg"
    try:
        if "," in base64_str:
            header, b64 = base64_str.split(",", 1)
        else:
            b64 = base64_str

        raw_bytes = base64.b64decode(b64)
        img = Image.open(io.BytesIO(raw_bytes))

        # 1. Orientation fix (phone rotation tag)
        img = ImageOps.exif_transpose(img)
        if img.mode != "RGB":
            img = img.convert("RGB")

        # 2. Autocontrast: low-contrast ya dark blur image ka dynamic range expand karta hai
        img = ImageOps.autocontrast(img, cutoff=1)

        # 3. Unsharp mask: blurry edges & text ko sharpen karta hai
        img = img.filter(ImageFilter.UnsharpMask(radius=2, percent=160, threshold=2))

        # 4. Contrast aur Sharpness enhancement
        img = ImageEnhance.Contrast(img).enhance(1.2)
        img = ImageEnhance.Sharpness(img).enhance(1.35)

        buf = io.BytesIO()
        img.save(buf, format="JPEG", quality=92, optimize=True)
        enhanced_b64 = base64.b64encode(buf.getvalue()).decode("utf-8")
        return f"data:image/jpeg;base64,{enhanced_b64}", "image/jpeg"
    except Exception:
        return base64_str, "image/jpeg"


async def gemini_json(prompt, image):
    if "," in image:
        header, b64 = image.split(",", 1)
        m = re.search(r"data:([\w/+.-]+);", header)
        mime = m.group(1) if m else "image/jpeg"
    else:
        mime = "image/jpeg"
        b64 = image
    body = lambda m: {
        "contents": [{"parts": [{"text": prompt}, {"inline_data": {"mime_type": mime, "data": b64}}]}],
        "generationConfig": {"responseMimeType": "application/json"}
    }
    j, err = await call(GEMINI, {"x-goog-api-key": env("GEMINI_API_KEY")}, body, models("GEMINI_MODEL", G_TEXT))
    if not j:
        return None, err
    parts = ((j.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
    return "".join(p.get("text", "") for p in parts), None


PROMPT = """You are an expert electronics engineer and PCB vision analyst.
You are inspecting a photo of a circuit board (PCB). The photo may be blurry, have camera motion blur, low lighting, or be taken at an angle (perspective tilted / skewed / rotated).

SPECIAL RECOVERY INSTRUCTIONS FOR BLURRY / TILTED IMAGES:
1. DESKEW & STRAIGHTEN PERSPECTIVE: If the board is tilted, angled, or rotated in the photo, mentally project and straighten the PCB to a true top-down (orthographic) flat rectangular plane.
2. BOUNDING BOXES: Calculate coordinates x, y, w, h as percentages (0-100) relative to the STRAIGHTENED rectangular board boundaries (0,0 = top-left, 100,100 = bottom-right).
3. INFER BLURRY / FAINT PARTS: Even if silkscreen labels are blurry, deduce components using their shape, pin count, solder pad footprints, colors, and circuit roles:
   - Small dual-terminal rectangular chips with silver end caps = resistor or capacitor.
   - Multi-pin chip near power input or inductor = controller/regulator IC.
   - Circular can with top cross/vent = electrolytic capacitor.
   - Metal shielded connector = USB port or jack.
   - Cylinder or flat glass body = diode.
   Do NOT skip components because of blur or tilt; estimate their location and role.

Return ONLY valid JSON with this exact format, no markdown fence:
{
  "board": {
    "aspect": <width/height of the rectified board from above>,
    "name": "<short guess what this board is, e.g. TP4056 Li-ion Charger, Arduino Nano, Buck Converter>"
  },
  "parts": [
    {
      "type": "usb_c|inductor|ic|resistor|capacitor|cap_electrolytic|diode|led|pad|hole|connector|transistor|crystal|button|antenna|other",
      "label": "<reference or printed label like U1, R1, C1, or best guess from context>",
      "value": "<printed value e.g. 2R2, 10k, or empty string>",
      "x": <center x 0-100>,
      "y": <center y 0-100>,
      "w": <width 0-100>,
      "h": <height 0-100>,
      "role": "<one short Hinglish sentence: what this part does in this circuit>"
    }
  ]
}
List every visible component (max 35)."""


def parse_num(v, default=0.0):
    if v is None:
        return default
    try:
        if isinstance(v, str):
            v = v.replace("%", "").strip()
        return float(v)
    except Exception:
        return default


def clean(spec):
    out = []
    for p in (spec.get("parts") or [])[:40]:
        if not isinstance(p, dict):
            continue
        try:
            t = p.get("type")
            q = {
                "type": t if t in TYPES else "other",
                "label": str(p.get("label") or "").strip(),
                "value": str(p.get("value") or "").strip(),
                "role": str(p.get("role") or "").strip(),
                "x": max(0.0, min(100.0, parse_num(p.get("x")))),
                "y": max(0.0, min(100.0, parse_num(p.get("y")))),
                "w": max(0.5, min(100.0, parse_num(p.get("w"), 5.0))),
                "h": max(0.5, min(100.0, parse_num(p.get("h"), 5.0))),
            }
            out.append(q)
        except Exception:
            continue
    b = spec.get("board") or {}
    aspect = parse_num(b.get("aspect"), 1.0)
    if aspect <= 0.1 or aspect > 10.0:
        aspect = 1.0
    return {
        "board": {
            "aspect": aspect,
            "name": str(b.get("name") or "Uploaded PCB").strip()
        },
        "parts": out
    }


class Img(BaseModel):
    image: str


class Chat(BaseModel):
    messages: list[dict]
    spec: dict | None = None
    sel: dict | None = None


@app.get("/api/status")
def status():
    return {k: bool(env(k.upper() + "_API_KEY")) for k in ("gemini", "groq", "openrouter")}


@app.get("/api/sample")
def sample():
    return SAMPLE


@app.post("/api/analyze")
async def analyze(req: Img):
    if not env("GEMINI_API_KEY"):
        return JSONResponse({"error": "GEMINI_API_KEY nahi mili (backend/.env me daalo)"}, 400)
    text, err = await gemini_json(PROMPT, req.image)
    if err:
        return JSONResponse({"error": "Gemini: " + str(err)}, 502)
    if not text:
        return JSONResponse({"error": "Gemini se khali response aaya."}, 502)

    cleaned_text = re.sub(r"^```(?:json)?\s*", "", text.strip(), flags=re.MULTILINE)
    cleaned_text = re.sub(r"\s*```$", "", cleaned_text.strip(), flags=re.MULTILINE)
    start = cleaned_text.find("{")
    end = cleaned_text.rfind("}")
    if start == -1 or end == -1 or start >= end:
        return JSONResponse({"error": "AI ka response valid JSON nahi tha."}, 502)

    try:
        raw_json = json.loads(cleaned_text[start : end + 1])
        spec = clean(raw_json)
    except Exception as e:
        return JSONResponse({"error": f"AI ka jawab samajh nahi aaya ({e})"}, 502)
    if not spec["parts"]:
        return JSONResponse({"error": "Koi part nahi mila. Seedhi, saaf photo try karo."}, 422)
    return spec


def system(spec, sel=None):
    return ("Tum Decompile 3D ke AI tutor ho. Ek normal chatbot (ChatGPT/Claude jaise) ki tarah baat karo: student jo puche sirf utna hi, seedha jawab do. "
            "Chhota sawal = chhota jawab; detail tabhi jab maange. Zabardasti step-by-step, summary ya end mein quiz sawal mat jodo. "
            "Student ki bhasha (Hinglish/Hindi/English) mein likho. Plain text ya halka markdown (**bold**, - list) theek hai; HTML tags (<br> etc.) aur tables kabhi nahi. "
            "Electronics ke har sawal ka jawab do. Neeche board JSON photo se AI ne pehchana hai, galat ho sakta hai: jab sawal board ke baare mein ho tabhi use karo, andaaza ho to 'andaaza' bolo.\nBOARD: "
            + json.dumps(spec or SAMPLE, ensure_ascii=False)
            + ("\nSTUDENT NE ABHI YE PART SELECT KIYA HAI: " + json.dumps(sel, ensure_ascii=False) if sel else ""))


@app.post("/api/chat")
async def chat(req: Chat):
    sys_prompt = system(req.spec, req.sel)
    msgs = [{"role": "system", "content": sys_prompt}] + req.messages[-10:]
    errs = []

    # 1. Pehle Groq try karo (fastest)
    if env("GROQ_API_KEY"):
        j, err = await call(GROQ[0], {"Authorization": f"Bearer {env('GROQ_API_KEY')}"},
                            lambda m: {"model": m, "messages": msgs, "max_tokens": 1200},
                            models("GROQ_MODEL", GROQ[1]))
        text = ((j or {}).get("choices") or [{}])[0].get("message", {}).get("content") if j else None
        if text:
            text = re.sub(r"</?[a-zA-Z][^>]*>", "", re.sub(r"<br\s*/?>", "\n", text))
            return {"reply": text.strip(), "provider": "groq"}
        errs.append(f"groq: {err or 'khali jawab'}")

    # 2. Agar Groq fail hua ya key nahi hai, Gemini try karo (agar GEMINI_API_KEY ho)
    if env("GEMINI_API_KEY"):
        chat_contents = []
        for m in req.messages[-10:]:
            role = "model" if m.get("role") == "assistant" else "user"
            chat_contents.append({"role": role, "parts": [{"text": m.get("content", "")}]})
        if not chat_contents:
            chat_contents = [{"role": "user", "parts": [{"text": "Hello"}]}]
        body = lambda m: {
            "system_instruction": {"parts": [{"text": sys_prompt}]},
            "contents": chat_contents
        }
        j, err = await call(GEMINI, {"x-goog-api-key": env("GEMINI_API_KEY")}, body, models("GEMINI_MODEL", G_TEXT))
        text = ((j or {}).get("candidates") or [{}])[0].get("content", {}).get("parts", [{}])[0].get("text") if j else None
        if text:
            text = re.sub(r"</?[a-zA-Z][^>]*>", "", re.sub(r"<br\s*/?>", "\n", text))
            return {"reply": text.strip(), "provider": "gemini"}
        errs.append(f"gemini: {err or 'khali jawab'}")

    # 3. OpenRouter fallback
    if env("OPENROUTER_API_KEY"):
        j, err = await call(OR[0], {"Authorization": f"Bearer {env('OPENROUTER_API_KEY')}"},
                            lambda m: {"model": m, "messages": msgs, "max_tokens": 1200},
                            models("OPENROUTER_MODEL", OR[1]))
        text = ((j or {}).get("choices") or [{}])[0].get("message", {}).get("content") if j else None
        if text:
            text = re.sub(r"</?[a-zA-Z][^>]*>", "", re.sub(r"<br\s*/?>", "\n", text))
            return {"reply": text.strip(), "provider": "openrouter"}
        errs.append(f"openrouter: {err or 'khali jawab'}")

    return {"reply": "⚠ Tutor chal nahi paya. .env me GROQ_API_KEY ya GEMINI_API_KEY check karo.\n" + "\n".join(errs)}
