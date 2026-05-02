const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

// Health check route
app.get("/", (req, res) => {
  res.send("Backend is running 🚀");
});

// Middlewares
app.use(express.json());
app.use(cookieParser());

// ✅ Read frontend URL(s) from env
const envOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

// ✅ Allowed origins (local + deployed frontend)
const allowedOrigins = [
  "http://localhost:5173",
  ...envOrigins
];

// ✅ CORS setup
app.use(cors({
  origin: function (origin, callback) {
    console.log("Request origin:", origin); // helpful debug

    // allow requests with no origin (like Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Not allowed by CORS: " + origin));
  },
  credentials: true
}));

// Routes
const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");

app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);

  res.status(400).json({
    message: err.message || "Request failed"
  });
});

module.exports = app;