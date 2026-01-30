import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Load environment variables
dotenv.config();

// Validate required env vars
if (!process.env.GEMINI_API_KEY) {
  console.error("❌ GEMINI_API_KEY is missing in environment variables");
  process.exit(1);
}

const app = express();

/* =========================
   Security & Middleware
========================= */

// Security headers
app.use(helmet());

// JSON body parsing
app.use(express.json({ limit: "10kb" }));

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["POST"],
    credentials: true,
  })
);

// Rate limiting (basic protection)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max requests per IP
  message: { error: "Too many requests, please try again later." },
});
app.use("/generate", limiter);

/* =========================
   Gemini Client
========================= */

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-3-flash-preview",
});

/* =========================
   Routes
========================= */

app.post("/generate", async (req, res) => {
  try {
    const { prompt } = req.body;

    if (typeof prompt !== "string" || prompt.trim().length === 0) {
      return res.status(400).json({
        error: "Valid prompt is required",
      });
    }

    const result = await model.generateContent(prompt);
    const output = result?.response?.text();

    if (!output) {
      return res.status(500).json({
        error: "Empty response from AI model",
      });
    }

    return res.status(200).json({ output });
  } catch (error) {
    console.error("❌ Generation Error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

/* =========================
   Health Check
========================= */

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "OK" });
});

/* =========================
   Server Start
========================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
