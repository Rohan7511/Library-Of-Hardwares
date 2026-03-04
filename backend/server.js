import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import operatorRoutes from "./routes/operatorRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/operator", operatorRoutes);
app.use("/api/admin", adminRoutes);

app.listen(process.env.PORT || 5000, () =>
  console.log("Server running")
);