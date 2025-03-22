
# 💬 Instant Messaging App (React + Socket.IO)

This is a full-stack instant messaging app featuring:

- ✅ User Sign Up / Login
- 🔎 Search for users by email
- 💬 Send & receive messages (real-time)
- 📌 Pinned chat history
- ❌ Delete conversation
- ✅ API testing with Jest + Supertest

---

## 🚀 Available Scripts

In the project directory, you can run:

### `npm start`

Starts the **frontend development server**.

- Opens [http://localhost:5173](http://localhost:5173)
- Loads sign-up, login, and chat interfaces
- Syncs with the backend via REST & Socket.IO

You can change the port in your `.env` file if needed.

---

### `npm test`

Launches the **test runner** with 30 total backend API tests:

| Feature        | Tests |
|----------------|-------|
| Sign Up        |   6   |
| Login          |   6   |
| Find User      |   6   |
| Send Chat      |   6   |
| Delete Message |   6   |

> ✅ Make sure your backend is running before testing!

```bash
npm test         # watch mode
npx jest         # one-off test run
```

Customize the backend URL in `tests/Flow.test.js`:

```js
const BASE_URL = 'http://localhost:4000'; // or your ngrok/render URL
```

---

### `npm run build`

Builds the app for production:

- Outputs to `/build`
- Optimized for speed and caching
- Ready to deploy to Render / Netlify / Vercel

---

### `npm run eject`

> ⚠️ Only use if you want to customize Webpack, Babel, etc.

---

## ⚙️ Environment Config

Create a `.env` file in your root:

```
REACT_APP_SERVER_URL=https://your-backend-url
PORT=5173
```

---

## 🔐 Backend Requirements

This frontend expects the following endpoints:

| Endpoint                            | Method |
|-------------------------------------|--------|
| /api/auth/signup                    | POST   |
| /api/auth/login                     | POST   |
| /api/auth/logout                    | POST   |
| /api/auth/userinfo                  | GET    |
| /api/contacts/search                | POST   |
| /api/contacts/get-contacts-for-list| GET    |
| /api/messages/send                  | POST   |
| /api/messages/get-messages          | POST   |
| /api/contacts/delete-dm/:id         | DELETE |

### Socket.IO Events

- `sendMessage`
- `receiveMessage`

---

## 📁 Folder Structure (Frontend)

```
src/
├── App.js
├── App.css
├── index.js
├── pages/
│   ├── LoginPage.js
│   ├── SignupPage.js
│   └── ChatPage.js
├── services/
│   ├── apiClient.js
│   └── socket.js
tests/
└── Flow.test.js 
```

---

## 🧠 Learn More

- [React Docs](https://reactjs.org/)
- [Jest Testing](https://jestjs.io/)
- [Socket.IO](https://socket.io/)
- [Create React App](https://create-react-app.dev/)

---
