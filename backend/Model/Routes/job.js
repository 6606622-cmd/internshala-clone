const express = require("express");
const router = express.Router();
const Job = require("../Job");

router.post("/", async (req, res) => {
  try {
    const jobdata = new Job({
      title: req.body.title,
      company: req.body.company,
      location: req.body.location,
      Experience: req.body.Experience,
      category: req.body.category,
      aboutCompany: req.body.aboutCompany,
      aboutJob: req.body.aboutJob,
      whoCanApply: req.body.whoCanApply,
      perks: req.body.perks,
      numberOfOpening: req.body.numberOfOpening,
      CTC: req.body.CTC,
      startDate: req.body.startDate,
      additionalInfo: req.body.additionalInfo,
    });

    const data = await jobdata.save();
    res.status(201).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Error posting job" });
  }
});

router.get("/", async (req, res) => {
  try {
    const data = await Job.find();
    res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const data = await Job.findById(req.params.id);

    if (!data) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.status(200).json(data);
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;