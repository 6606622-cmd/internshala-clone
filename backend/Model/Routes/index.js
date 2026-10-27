
const express = require("express");

const router = express.Router();

const admin = require("./admin");
const intern = require("./internship");
const job = require("./job");
const application = require("./application");
const language = require("./language");
const resume = require("./resume");
const resumePayment = require("./resumePayment");
const forgotPassword = require("./forgotPassword");
const publicSpaceFriendship = require("./publicSpaceFriendship");
const publicSpacePost = require("./publicSpacePost");
const publicSpaceInteractions = require("./publicSpaceInteractions");

router.use("/admin", admin);
router.use("/internship", intern);
router.use("/job", job);
router.use("/application", application);
router.use("/language", language);
router.use("/resume", resume);
router.use("/resume", resumePayment);
router.use("/forgot-password", forgotPassword);
router.use("/public-space/friendships", publicSpaceFriendship);
router.use("/public-space/posts", publicSpacePost);
router.use("/public-space/interactions", publicSpaceInteractions);

module.exports = router;