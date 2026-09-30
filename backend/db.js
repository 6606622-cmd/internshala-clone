const mongoose = require("mongoose");

require("dotenv").config();

const url = process.env.DATABASE_URL;

module.exports.connect = () => {
    mongoose.connect(url)
        .then(() => {
            console.log("Database is connected");
        })
        .catch((error) => {
            console.log("Database connection error:", error);
        });
};