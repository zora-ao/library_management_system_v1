# 📚 Library Management System

A full-stack Library Management System built with:

- React + TypeScript
- Flask
- PostgreSQL
- SQLAlchemy
- JWT Authentication

## Features

- User Authentication
- Role-based Access
- Book Management
- Borrow & Return Books
- Dashboard

## Tech Stack

Frontend
- React
- TypeScript
- React Query
- Tailwind CSS

Backend
- Flask
- Flask SQLAlchemy
- Flask JWT Extended
- PostgreSQL

## Installation

### Backend

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` folder and add your environment variables.

Example:

```env
DATABASE_URL=your_postgresql_database_url
JWT_SECRET_KEY=your_secret_key
```

### Frontend

```bash
cd frontend
npm install
```

## Running the Project

You need to run the **backend** and **frontend** separately.

### 1. Start the Backend

Open a terminal:

```bash
cd backend
python run.py
```

The Flask server should start at:

```text
http://localhost:5000
```

### 2. Start the Frontend

Open another terminal:

```bash
cd frontend
npm run dev
```

The React application should start at:

```text
http://localhost:5173
```

Open the frontend URL in your browser to use the application.
