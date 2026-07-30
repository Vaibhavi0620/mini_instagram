# 📸 Mini Instagram API

A lightweight, clean RESTful backend API for a mini Instagram clone built with **Node.js**, **Express**, and **MongoDB**. Includes modern JWT authentication, post creation, commenting, and user relationship management.

---

## 🚀 Features

- **Authentication:** User registration, login, and JWT-based route protection.
- **Posts:** Create, view, like, and delete posts with image URLs and captions.
- **Comments:** Add and view comments on posts.
- **Users:** Fetch user profiles and follow/unfollow users.
- **Error Handling:** Centralized error-handling middleware.

---

## 🛠️ Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (via Mongoose ODM)
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs
- **Environment Management:** dotenv
- **CORS:** Enabled for frontend integration

---

## 📁 Project Structure

```text
├── config/             # Database connection & setup
├── controllers/        # Request handlers & logic
├── middleware/         # Auth & error handling middlewares
├── models/             # Mongoose schemas (User, Post, Comment)
├── routes/             # Express API routes
│   ├── authRoutes.js
│   ├── userRoutes.js
│   ├── postRoutes.js
│   └── commentRoutes.js
├── .env.example        # Environment variables template
├── server.js           # Server entry point
└── README.md           # Project documentation
