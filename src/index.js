import express from "express";
import "dotenv/config";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import collectionRoutes from "./routes/collectionRoutes.js";

// Import to database
import { connectDB } from "./lib/db.js";

// Import cors middleware and cron job
import cors from "cors";
import job from "./lib/cron.js";


const app = express();

const PORT = process.env.PORT || 3000; 

job.start(); // Start the cron job
// Add a middleware to parse JSON bodies
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

app.use("/api/auth", authRoutes);

app.use("/api/collections", collectionRoutes);

app.listen(PORT, () =>{
    console.log(`Server is running on port ${PORT}`);    
    connectDB(); // Connect to the database
})