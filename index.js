import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./db/connect.js";
import authRoutes from './routes/authRoutes.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 9001;

await connectDB();

app.use(express.json())

app.use('/api/auth', authRoutes)

app.post("/api", (req, res) => {
  const sampleBody = req.body
  res.json({
    message: "Hello from the Brewery Finder API",
    sentBody: sampleBody,
    status: "ok",
  });
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
