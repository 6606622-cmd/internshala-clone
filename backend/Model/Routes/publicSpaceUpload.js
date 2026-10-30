const express = require("express");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const router = express.Router();
const requireFirebaseAuth = require("../../middleware/requireFirebaseAuth");

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB

const ALLOWED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_VIDEO_SIZE,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      return callback(
        new Error("Unsupported video format. Please use MP4, WebM, MOV or OGG.")
      );
    }

    callback(null, true);
  },
});

function configureCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
    process.env;

  if (
    !CLOUDINARY_CLOUD_NAME ||
    !CLOUDINARY_API_KEY ||
    !CLOUDINARY_API_SECRET
  ) {
    throw new Error("Cloudinary environment variables are not configured.");
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });
}

router.post(
  "/video",
  requireFirebaseAuth,
  (req, res, next) => {
    upload.single("video")(req, res, (error) => {
      if (error) {
        const isTooLarge = error instanceof multer.MulterError &&
          error.code === "LIMIT_FILE_SIZE";

        return res.status(isTooLarge ? 413 : 400).json({
          message: isTooLarge
            ? "Video exceeds the 50 MB upload limit."
            : error.message || "Unable to receive video.",
        });
      }

      next();
    });
  },
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          message: "Please select a video to upload.",
        });
      }

      configureCloudinary();

      const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: "video",
            folder: "internarea/public-space/videos",
          },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          }
        );

        stream.end(req.file.buffer);
      });

      return res.status(201).json({
        message: "Video uploaded successfully.",
        media: {
          type: "video",
          url: uploaded.secure_url,
          storageKey: uploaded.public_id,
          contentHash: uploaded.etag || "",
        },
      });
    } catch (error) {
      console.error("Public Space video upload failed:", error);

      return res.status(500).json({
        message: "Video upload failed. Please try again.",
      });
    }
  }
);

module.exports = router;