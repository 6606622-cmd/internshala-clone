
require("dotenv").config();

console.log("OTP_PEPPER configured:", Boolean(process.env.OTP_PEPPER));
console.log("OTP_PEPPER length:", process.env.OTP_PEPPER?.length || 0);

const bodyparser = require("body-parser");
const express = require("express");
const cors = require("cors");
const { connect } = require("./db");
const router = require("./Model/Routes/index");

const app = express();
const port = process.env.PORT || 5000;

const allowedOrigins = [
  "https://internshala-clone-ezki.vercel.app",
  "https://internarea-frontend-honf.onrender.com",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(bodyparser.json({ limit: "50mb" }));
app.use(bodyparser.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("hello this is internshala backend");
});

app.use("/api", router);

connect();

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
