# Valet Management System

**Smart Valet Management Platform for Restaurants & Businesses — Turkey**

[![FastAPI](https://img.shields.io/badge/FastAPI-Python_3.11-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow?style=for-the-badge)](./LICENSE)

---

## Overview

Vale Yönetim Sistemi is a real-time valet management platform built for restaurants and hospitality businesses. Customers scan a QR code from their table to request their vehicle, valet staff manage all active vehicles through a kanban-style dashboard, and business owners access daily metrics and reports — all without phone calls or paper tickets.

## Features

**Customer Interface (QR Page)**
- Plate number validation against the day's registered vehicles
- Estimated pickup time selection — 5, 10, or 15 minutes
- Optional WhatsApp confirmation message
- Mobile-first PWA, works offline

**Valet Dashboard**
- Kanban board: Parked → Requested → Preparing → Ready → Delivered
- Countdown ring with audio alert per vehicle card
- Vehicle photo capture from camera or gallery
- Quick 3-digit plate search
- Hidden valet notes per vehicle
- Loyalty indicator — customers with 3+ visits in 90 days
- 5-second polling for real-time updates; offline queue via IndexedDB

**Owner Dashboard**
- Daily metrics: vehicles in, out, currently parked
- Hourly heatmap
- CSV report export
- WhatsApp daily summary — scheduled via APScheduler
- Plate correction tool

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI, Python 3.11, Uvicorn |
| Frontend | React 18, TypeScript, Tailwind CSS |
| Database | PostgreSQL 15, SQLModel (ORM) |
| Messaging | WhatsApp Business API (Meta Cloud API) |
| Scheduler | APScheduler |
| Infrastructure | Docker, Docker Compose |

## Getting Started

```bash
git clone https://github.com/aikirbaclayan/vale-sistemi.git
cd vale-sistemi

# Copy and configure environment
cp backend/env_example.txt backend/.env
# Edit backend/.env with your values

# Start the database
docker-compose up -d postgres

# Start the backend
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux / macOS
pip install -r requirements.txt
uvicorn main:app --reload

# Start the frontend (new terminal)
cd frontend
npm install
npm start
```

| Service | URL |
|---|---|
| Customer Page | http://localhost:3000 |
| Valet Dashboard | http://localhost:3000/valet |
| Owner Dashboard | http://localhost:3000/owner |
| API / Swagger Docs | http://localhost:8000/docs |

Or start everything at once with Docker Compose:

```bash
docker-compose up -d
```

## Environment Variables

Copy `backend/env_example.txt` to `backend/.env` and fill in:

```env
DATABASE_URL=postgresql://vale_user:vale_password@localhost:5432/vale_system
SECRET_KEY=your-strong-secret-key

# WhatsApp Business API (optional)
WHATSAPP_TOKEN=your_access_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_webhook_token
OWNER_PHONE=905XXXXXXXXX

# Scheduler
DAILY_SUMMARY_TIME=22:30
```

> **Never commit your `.env` file.** Use `env_example.txt` as the template.

## Project Structure

```
vale-sistemi/
├── backend/
│   ├── app/
│   │   ├── api/api_v1/endpoints/   # customer, valet, owner, whatsapp
│   │   ├── core/                   # config, database
│   │   ├── models/                 # SQLModel models
│   │   └── services/               # WhatsApp service
│   ├── alembic/                    # database migrations
│   ├── main.py
│   └── requirements.txt
├── frontend/src/
│   ├── components/                 # CountdownCircle, PlateInput, StatusChip…
│   ├── hooks/                      # useOffline
│   ├── pages/                      # CustomerPage, ValetDashboard, OwnerDashboard
│   ├── services/                   # axios API client
│   └── utils/                      # offline queue (IndexedDB)
├── docs/
├── docker-compose.yml
└── README.md
```

## Vehicle State Machine

```
PARKED → REQUESTED → PREPARING → READY → DELIVERED
```

Business rules:
- Only plates registered today are accepted on the customer page
- A vehicle can only be requested when its status is `PARKED`
- Duplicate plates are rejected at both the API and database level
- Loyalty flag is computed automatically: 3+ visits in the last 90 days

## API Endpoints

| Group | Method | Path |
|---|---|---|
| Customer | GET | `/api/v1/customer/validate-plate/{plate}` |
| Customer | POST | `/api/v1/customer/request-vehicle` |
| Customer | GET | `/api/v1/customer/vehicle-status/{plate}` |
| Valet | GET | `/api/v1/valet/vehicles` |
| Valet | POST | `/api/v1/valet/vehicles` |
| Valet | PUT | `/api/v1/valet/vehicles/{id}/status` |
| Valet | POST | `/api/v1/valet/vehicles/{id}/deliver` |
| Valet | POST | `/api/v1/valet/vehicles/{id}/photo` |
| Owner | GET | `/api/v1/owner/metrics` |
| Owner | GET | `/api/v1/owner/report/{date}` |
| Owner | POST | `/api/v1/owner/send-daily-summary` |
| Owner | PUT | `/api/v1/owner/vehicles/{id}/correct-plate` |

Full interactive docs at `http://localhost:8000/docs`.

## License

[MIT License](./LICENSE)
