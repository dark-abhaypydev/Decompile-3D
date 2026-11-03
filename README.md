# Decompile 3D (Python + React)
Photo upload -> AI board JSON -> KiCad-style 3D board + real photo side-by-side + waveform + AI tutor.

---

## 🚀 Sabse Aasan Tareeka (One-Click Start)
Windows par bas **`run.bat`** par double click karo:
- Backend (`http://localhost:8000`) aur Frontend (`http://localhost:5173`) dono apne aap chal jayenge.
- Browser me `http://localhost:5173` khul jayega.

---

## 🛠 Manual Setup & Run

### 1. Backend (Python / FastAPI)
```bash
cd backend
# virtualenv activate karo (agar bani ho)
..\.venv\Scripts\activate
# Dependencies
pip install -r requirements.txt
# .env file setup karo
copy .env.example .env
# Server start karo
uvicorn main:app --reload --port 8000
```

### 2. Frontend (React + React Three Fiber)
```bash
cd frontend
npm install
npm run dev
```
Browser me open karo: `http://localhost:5173`

---

## 🔑 API Keys (`backend/.env`)
- **`GEMINI_API_KEY`**: PCB Photo upload hone par Gemini AI se components pehchan kar JSON format me convert karta hai. (Google AI Studio: https://aistudio.google.com/apikey)
- **`GROQ_API_KEY`**: Super-fast AI Electronics Tutor chat. (Groq Console: https://console.groq.com/keys)
- **`OPENROUTER_API_KEY`** *(Optional)*: Chat ke liye backup.
- *Note:* Agar Groq key na ho toh Tutor chat automatically Gemini se chalegi!

---

## 📁 Project Structure
- `backend/main.py`: FastAPI backend, Gemini PCB vision analysis aur Tutor chat.
- `backend/sample.json`: Default demo Li-ion charger board.
- `frontend/src/Board3D.jsx`: Interactive Three.js / React Three Fiber 3D PCB model.
- `frontend/src/App.jsx`: Main application UI, side-by-side photo inspection, tutor panel.
- `frontend/src/Wave.jsx`: Real-time interactive electronic signal waveforms.
