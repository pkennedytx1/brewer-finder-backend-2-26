import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/authRoutes.js";
import breweryRoutes from "./routes/breweries.js";
import favoriteRoutes from "./routes/favorites.js";
import { protect } from "./middleware/auth.js";
import cors from "cors";
import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  ...(process.env.FRONTEND_ORIGIN ? [process.env.FRONTEND_ORIGIN] : []),
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

app.use(express.json());

const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Brewery API",
      version: "1.0.0",
      description: "MERN stack brewery API",
    },
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
  apis: ["./routes/*.js"],
};

const spec = swaggerJsdoc(swaggerOptions);
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));

app.use("/api/auth", authRoutes);
app.use("/api/breweries", breweryRoutes);
app.use("/api/favorites", favoriteRoutes);

app.post("/api", protect, (req, res) => {
  const sampleBody = req.body;
  res.json({
    message: "Hello from the Brewery Finder API",
    sentBody: sampleBody,
    userId: req.user.id,
    status: "ok",
  });
});

app.use(express.static(path.join(__dirname, "public")));

export default app;
