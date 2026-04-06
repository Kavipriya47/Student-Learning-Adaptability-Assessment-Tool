# SLAA • Student Learning Adaptability Assessment Platform

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Kavipriya47/Student-Learning-Adaptability-Assessment-Tool)

A high-performance, AI-orchestrated analytics platform built for institutional transparency and student success tracking. The SLAA platform transforms raw behavioral and academic data into actionable insights for Administrators, Mentors, and Students.

---

## 🎨 System Architecture & Visual Language

This project has been fully restructured for production, replacing legacy "client/server" layouts with a streamlined, decoupled service architecture.

### ✨ Key Visual Evolutions
*   **Command Center (Admin)**: A high-density, glassmorphic dashboard for institutional oversight.
*   **Dimension Bars (Student)**: Replaced high-distortion Radar charts with linear, data-accurate performance vectors for clearer self-assessment.
*   **Automated Priority (Mentor)**: Removed manual status tags in favor of data-driven **Priority Badges** (`Critical`, `Moderate`, `Stable`) that update in real-time based on adaptability scores.

---

## 🚀 Key Features

| Role | Core Capabilities |
| :--- | :--- |
| **🛡️ Admin** | Fleet management, multi-department oversight, automated risk distribution, and staff-student mapping. |
| **👩‍🏫 Mentor** | Automated student prioritization, dynamic intervention tracking, and reward point allocation. |
| **🎓 Student** | Progress visualization via Dimension Bars, performance trends, and adaptability factor analysis. |

---

## 🛠️ Technology Stack

-   **Frontend**: React (19+), Tailwind CSS, Framer Motion (Glassmorphism), Recharts, Lucide Icons.
-   **Backend**: Node.js, Express, MongoDB Atlas (Mongoose).
-   **Security**: JWT (Access/Refresh rotation), OTP-based Verification, Role-Based Access Control (RBAC).
-   **Cloud**: Cloudinary (Image Orchestration), Render (Automated CI/CD).

---

## 🌍 One-Click Deployment

This repository is pre-configured with a **`render.yaml`** Blueprint. 

1.  **Fork** this repository.
2.  Go to **Render Dashboard** → **Blueprints**.
3.  Connect this repository.
4.  Enter your `MONGODB_URI`, `JWT_SECRET`, and `CLOUDINARY` credentials.

**Render will automatically:**
1.  Spin up your **`slaa-api`** (Node/Express).
2.  Spin up your **`slaa-web`** (React Static Site).
3.  Connect the internal URLs for a seamless handshake.

---

## 💻 Local Setup

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/Kavipriya47/Student-Learning-Adaptability-Assessment-Tool.git
    cd Student-Learning-Adaptability-Assessment-Tool
    ```

2.  **Install Dependencies**:
    ```bash
    cd backend && npm install
    cd ../frontend && npm install
    ```

3.  **Environment Configuration**:
    -   Create `.env` in `backend/` using `backend/.env.example`.
    -   Create `.env` in `frontend/` (set `REACT_APP_API_URL=http://localhost:5000`).

4.  **Launch the System**:
    -   Backend: `npm run dev`
    -   Frontend: `npm start`

---

*Built with ♥ for the Advanced Agentic Coding project.*
