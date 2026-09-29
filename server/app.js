// Express app factory — middleware and routes only
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const healthRoutes = require("./routes/healthRoutes");
const errorHandler = require("./middleware/errorHandler");

const app = express();

const allowedOrigins = process.env.CLIENT_ORIGIN 
  ? process.env.CLIENT_ORIGIN.split(',') 
  : ["http://localhost:3000", "https://codesync-clients.onrender.com"];

app.use(helmet());
app.use(cors({ origin: allowedOrigins }));
app.use(express.json());

// Routes
app.use("/api", healthRoutes);

// Error handling middleware (must be last)
app.use(errorHandler);

module.exports = app;
