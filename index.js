import "dotenv/config";
import app from "./app.js";
import { connectDB } from "./db/connect.js";

const PORT = process.env.PORT || 9002;

await connectDB();

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
