const express = require("express");
const router = express.Router();

const adminuser = "uddinadnan558_db_user";
const adminpass = "admin";

router.post("/adminlogin", (req, res) => {
  const { username, password } = req.body;

  console.log("Login request:", username);

  if (username === adminuser && password === adminpass) {
    res.status(200).send("admin is here");
  } else {
    res.status(401).send("unauthorized");
  }
});

module.exports = router;