const express = require("express");
const mongoose = require("mongoose");
const router = require("./routes/user-routes");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();
const connectDB = require("./db");

const EmailCredentials = require("./model/emailCredentials");

const corsOptions = {
  origin: "http://localhost:5173",
  methods: "GET,POST,PUT,DELETE",
  credentials: true,
};
const app = express();
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use("/api", router);

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 5000, () => {
      console.log("Server is running on port", process.env.PORT || 5000);
    });
  })
  .catch((err) => console.error("Error connecting to MongoDB:", err));
