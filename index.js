import "dotenv/config";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { connectDB } from "./db/connect.js";
import authRoutes from './routes/authRoutes.js'
import breweryRoutes from './routes/breweries.js'
import favoriteRoutes from './routes/favorites.js'
import { protect } from './middleware/auth.js'
import cors from 'cors'
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 9001;

await connectDB();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))

app.use(express.json())

// Swagger Documentation
const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Brewery API",
      version: "1.0.0",
      description: "MERN stack brewery API",
    },
    // Helps "Try it out" hit the right host/port
    servers: [{ url: "http://localhost:9001" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
  },
  apis: ["./routes/*.js"], // scans JSDoc @openapi comments
};

const spec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));

app.use('/api/auth', authRoutes)
app.use('/api/breweries', breweryRoutes)
app.use('/api/favorites', favoriteRoutes)

app.post("/api", protect, (req, res) => {
  const sampleBody = req.body
  res.json({
    message: "Hello from the Brewery Finder API",
    sentBody: sampleBody,
    userId: req.user.id,
    status: "ok",
  });
});

app.use(express.static(path.join(__dirname, "public")));

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
