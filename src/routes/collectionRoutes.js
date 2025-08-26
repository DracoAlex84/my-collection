import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Collection from "../models/Collections.js";
import protectRoute from "../middleware/auth.middleware.js";
import multer from "multer";

const router = express.Router();

// Multer en memoria (acepta solo imágenes)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image uploads are allowed"));
    }
    cb(null, true);
  },
});

// Helper: subir buffer a Cloudinary usando stream
const uploadFromBuffer = (buffer, opts = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "collections", ...opts },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });

// Helper: subir base64 (acepta data URL o base64 puro)
const uploadFromBase64 = (imageStr, opts = {}) => {
  const src = imageStr.startsWith("data:")
    ? imageStr
    : `data:image/jpeg;base64,${imageStr}`;
  return cloudinary.uploader.upload(src, { folder: "collections", ...opts });
};

// Creation route
router.post("/", protectRoute, upload.single("image"), async (req, res) => {
  try {
    const { title, caption, category, status, brand, image: imageBody } = req.body;

    // Validación de campos de texto
    if (!title || !caption || !category || !status || !brand) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Subida de imagen: archivo (FormData) o base64 (body)
    let uploadedImage;
    if (req.file?.buffer) {
      uploadedImage = await uploadFromBuffer(req.file.buffer);
    } else if (imageBody) {
      uploadedImage = await uploadFromBase64(imageBody);
    } else {
      return res.status(400).json({ message: "Image is required" });
    }

    const newCollection = new Collection({
      title,
      caption,
      image: uploadedImage.secure_url,
      imagePublicId: uploadedImage.public_id, // <-- guarda public_id
      category,
      status,
      brand,
      user: req.user._id,
    });

    await newCollection.save();
    res.status(201).json(newCollection);
  } catch (error) {
    console.error("Error creating collection:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Fetch all collections route with pagination
router.get("/", protectRoute, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const skip = (page - 1) * limit;

    const collections = await Collection.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("user", "username profilePicture");

    const totalCollections = await Collection.countDocuments();

    res.send({
      collections,
      currentPage: page,
      totalCollections,
      totalPages: Math.ceil(totalCollections / limit),
    });
  } catch (error) {
    console.log("Error fetching collections:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Delete collection route
router.delete("/:id", protectRoute, async (req, res) => {
  try {
    const collection = await Collection.findById(req.params.id);
    if (!collection) {
      return res.status(400).json({ message: "Collection not found" });
    }

    // Autorización
    if (collection.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to delete this collection" });
    }

    // Borra imagen por public_id si existe
    if (collection.imagePublicId) {
      try {
        await cloudinary.uploader.destroy(collection.imagePublicId);
        console.log("Image deleted from Cloudinary successfully");
      } catch (err) {
        console.log("Error deleting image from Cloudinary:", err);
      }
    }

    await collection.deleteOne();
    res.status(200).json({ message: "Collection deleted successfully" });
  } catch (error) {
    console.log("Error deleting collection:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
