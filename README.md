<div align="center">
  <img src="public/logo.png" alt="Sahay Logo" width="150" height="150" />
  <h1>Sahay</h1>
  <p><strong>Coordinate. Respond. Save Lives.</strong></p>
  <p>A real-time NGO and volunteer coordination platform for disaster and crisis response.</p>
</div>

## Overview

**Sahay** is a comprehensive platform designed to streamline disaster relief operations. It connects Non-Governmental Organizations (NGOs) and volunteers, enabling them to coordinate efficiently during crises. 

By leveraging real-time data synchronization and AI-powered tools, Sahay ensures that critical resources reach where they are needed most, reducing response times and saving lives.

## Key Features

- **Swarm Map:** A real-time geographic visualization of active relief operations, tasks, and volunteer locations.
- **Gemini-Powered OCR Scanner:** Digitize handwritten or printed paper field reports instantly. The AI automatically extracts needs, locations, and urgencies to create actionable, geocoded tasks on the map.
- **Supply Bridge:** A micro-inventory system that allows NGOs to share, request, and trade critical supplies (Food, Medical, Shelter, Rescue) across the network.
- **Volunteer Dashboard:** Volunteers can view nearby tasks, accept missions, and communicate with their assigned NGOs.
- **Secure Authentication:** Role-based access control with secure login for both volunteers and NGO Administrators.

## Tech Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Motion (Animations)
- **Map Integration:** Leaflet & React-Leaflet
- **Backend/Database:** Firebase (Auth, Firestore, Cloud Functions, Hosting)
- **AI Integration:** Google Gemini AI (for OCR field report scanning)

## Getting Started

### Prerequisites
- Node.js (v20+)
- Firebase CLI (`npm install -g firebase-tools`)

### Local Development Setup

1. **Clone the repository** and navigate to the directory:
   ```bash
   cd sahay
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Variables:**
   Set up your environment variables. Ensure that you have a `.env` file with your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the local development server:**
   ```bash
   npm run dev
   ```
   The application will be available at `http://localhost:3000`.

## Deployment

Sahay is configured to be deployed on **Firebase Hosting**.

1. Authenticate with Firebase:
   ```bash
   firebase login
   ```

2. Build the production assets:
   ```bash
   npm run build
   ```

3. Deploy to Firebase:
   ```bash
   firebase deploy --only hosting
   ```
