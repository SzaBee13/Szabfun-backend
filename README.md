# Szabfun Backend

## Overview

Szabfun Backend is a Node.js application that powers the Szabfun platform. It provides REST APIs and Socket.IO endpoints for user management, admin features, custom links, multiplayer Tic-Tac-Toe, and Chaos Clicker events.

---

## Project Structure

```sh
backend/
├── dbs/
│   ├── admins.db
│   ├── data.db
│   ├── sus-link.db
│   └── users.db
├── src/
│   ├── admin.js
│   ├── chaos-clicker.js
│   ├── email.js
│   ├── game-save.js
│   ├── owner.js
│   ├── server.js
│   ├── sus-link.js
│   ├── tic-tac-toe.js
│   └── users.js
├── .env
├── .gitignore
├── Dockerfile
├── package.json
└── README.md
```

---

## Setup Instructions

1. **Clone the repository:**
   ```sh
   git clone https://github.com/SzaBee13/Szabfun-backend
   cd Szabfun-backend
   ```

2. **Install dependencies:**
   ```sh
   npm install
   ```

3. **Configure environment variables:**
   - Copy this to `.env` or create a `.env` file in the root:
     ```env
     CLIENT_ID=your-google-client-id
     CLIENT_SECRET=your-google-client-secret
     REDIRECT_URI=your-redirect-uri
     REFRESH_TOKEN=your-refresh-token
     OWNER=your-google-id
     ```
   - Fill in your Google API credentials and owner Google ID.

4. **Ensure the `dbs` folder exists:**
   ```sh
   mkdir -p dbs
   ```
   The app will create the necessary `.db` files on first run.

5. **Run the application:**
   ```sh
   npm start
   ```
   The server will run at [http://localhost:3000](http://localhost:3000).

---

## API Endpoints & Features

See the <a href="https://szabfun.pages.dev.">docs</a> for Endpoints and Features

---

## Development & Contributing

- PRs and issues are welcome!
- See `src/` for modular code organization.
- See <a href="./run.md">run.md</a> if you want to run it with docker