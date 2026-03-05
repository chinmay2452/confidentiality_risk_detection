# Architecture Confidentiality Risk Detector

A web application that analyzes software architecture designs and detects confidentiality risks using a rule-based security engine.

**Tech Stack:** FastAPI (Python) · React (Vite) · Supabase (PostgreSQL)

---

## Prerequisites

- **Python 3.9+** installed
- **Node.js 18+** and **npm** installed
- A **Supabase** account (free tier works) — [https://supabase.com](https://supabase.com)

---

## Step 1: Set Up Supabase

1. Go to [https://supabase.com](https://supabase.com) and create a new project.
2. Once the project is ready, go to **Settings → API** and copy:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public key**
3. Go to **SQL Editor** in the Supabase dashboard and run this SQL to create the tables:

```sql
CREATE TABLE architectures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  architecture_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE risk_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  architecture_id UUID REFERENCES architectures(id),
  risks_json JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Step 2: Set Up the Backend

1. Open a terminal and go to the `backend` folder:

```bash
cd backend
```

2. Create a virtual environment and activate it:

```bash
python -m venv venv

# Windows:
venv\Scripts\activate

# Mac/Linux:
source venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Create a `.env` file in the `backend` folder (copy from the example):

```bash
copy .env.example .env
```

5. Open the `.env` file and paste your Supabase credentials:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

6. Start the backend server:

```bash
uvicorn app.main:app --reload
```

The backend will run at **http://localhost:8000**. You can see the API docs at **http://localhost:8000/docs**.

---

## Step 3: Set Up the Frontend

1. Open a **new terminal** and go to the `frontend` folder:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the frontend dev server:

```bash
npm run dev
```

The frontend will run at **http://localhost:5173**.

---

## How to Use

1. Open **http://localhost:5173** in your browser.
2. Click **"Analyze"** in the top menu.
3. You can either:
   - Use the **Builder** tab to manually add components and connections
   - Use the **JSON Editor** tab to paste architecture JSON
   - Use the **Upload** tab to upload a JSON file
   - Click **"Load Sample Architecture"** to try a pre-built example
4. Click **"Analyze Architecture"** to run the analysis.
5. The system will show detected risks with severity levels (High, Medium, Low).
6. You can save the architecture and report to Supabase by entering a name and clicking **"Save"**.
7. Saved architectures appear on the **Dashboard** page.

---

## Example Architecture JSON

```json
{
  "components": [
    { "name": "Web App", "type": "frontend", "stores_sensitive_data": true },
    { "name": "API Server", "type": "backend", "stores_sensitive_data": true },
    { "name": "User DB", "type": "database", "stores_sensitive_data": true },
    { "name": "Payment Gateway", "type": "third-party", "stores_sensitive_data": false }
  ],
  "connections": [
    { "source": "Web App", "target": "API Server", "encrypted": true, "has_authentication": true },
    { "source": "API Server", "target": "User DB", "encrypted": false, "has_authentication": true },
    { "source": "API Server", "target": "Payment Gateway", "encrypted": true, "has_authentication": true }
  ]
}
```

---

## Risk Rules

The system evaluates 6 confidentiality rules:

| # | Rule | Severity |
|---|------|----------|
| 1 | Sensitive data flows through an unencrypted connection | HIGH |
| 2 | Public-facing component directly accesses a database | HIGH |
| 3 | Sensitive data is stored in a frontend component | HIGH |
| 4 | Third-party service accesses sensitive data | MEDIUM |
| 5 | Encryption exists but authentication is missing | MEDIUM |
| 6 | Multiple data hops without security validation | LOW |

---

## Project Structure

```
confidentiality_risk_detection/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI entry point
│   │   ├── config.py            # Environment variables
│   │   ├── database.py          # Supabase client
│   │   ├── models/
│   │   │   └── schemas.py       # Pydantic models
│   │   ├── routes/
│   │   │   └── analysis.py      # API endpoints
│   │   ├── services/
│   │   │   ├── analyzer.py      # Analysis orchestrator
│   │   │   └── rule_engine.py   # Rule-based risk engine
│   │   └── utils/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── api.js           # API client
│   │   ├── components/
│   │   │   ├── ArchitectureForm.jsx
│   │   │   ├── ArchitectureGraph.jsx
│   │   │   ├── JsonUploader.jsx
│   │   │   ├── Navbar.jsx
│   │   │   └── RiskTable.jsx
│   │   ├── pages/
│   │   │   ├── AnalyzePage.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── ReportPage.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── README.md
```
