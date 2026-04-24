# BFHL Full Stack Submission
Made by Disha Dewangan AP23110010433 (dewangan_disha@srmap.edu.in)

This repository contains:

- `backend/`: Node.js + Express API implementing `POST /bfhl`
- `frontend/`: React app to submit node lists and display structured output

## 1) Backend Setup

```bash
cd backend
npm install
```

Create `.env` from `.env.example` and update identity values:

```env
PORT=3000
USER_ID=yourname_ddmmyyyy
EMAIL_ID=your.college.email@example.com
COLLEGE_ROLL_NUMBER=YOURROLLNUMBER
```

Run backend:

```bash
npm run start
```

API URL (local): `http://localhost:3000/bfhl`

## 2) Frontend Setup

```bash
cd frontend
npm install
```

Create `.env` from `.env.example`:

```env
VITE_API_BASE_URL=http://localhost:3000
```

Run frontend:

```bash
npm run dev
```

## 3) API Contract

### Request

`POST /bfhl`

```json
{
  "data": ["A->B", "A->C", "B->D"]
}
```

### Response fields

- `user_id`
- `email_id`
- `college_roll_number`
- `hierarchies` (`root`, `tree`, `depth` for trees, or `has_cycle: true` with empty `tree`)
- `invalid_entries`
- `duplicate_edges`
- `summary` (`total_trees`, `total_cycles`, `largest_tree_root`)

## 4) Deploy

### Backend (Render / Railway)

- Deploy `backend/` as a Node web service.
- Set env vars from `backend/.env.example`.
- Confirm route `POST /bfhl` works.

### Frontend (Vercel / Netlify)

- Deploy `frontend/`.
- Set `VITE_API_BASE_URL` to hosted backend base URL.
- Verify submit action from frontend calls backend successfully.

## 5) Submission Checklist

- Hosted backend base URL (without `/bfhl`)
- Hosted frontend URL
- Public GitHub repository URL
- Resume link
- Ensure API allows CORS and processes dynamic inputs (no hardcoding)
