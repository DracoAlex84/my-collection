import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Collection from "../models/Collections.js";
import protectRoute from "../middleware/auth.middleware.js";
import multer from "multer";

const router = express.Router();

// Configuración de multer en memoria
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Crear colección con subida de imagen
router.post("/", protectRoute, upload.single("image"), async (req, res) => {
    try {
        const { title, caption, category, status, brand } = req.body;

        if (!title || !caption || !category || !status || !brand) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Image file is required" });
        }

        // Función para subir a Cloudinary usando el buffer
        const streamUpload = (buffer) => {
            return new Promise((resolve, reject) => {
                const stream = cloudinary.uploader.upload_stream(
                    { folder: "collections" },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result);
                    }
                );
                stream.end(buffer);
            });
        };

        // Subir imagen a Cloudinary
        const uploadedImage = await streamUpload(req.file.buffer);

        // Guardar colección en MongoDB
        const newCollection = new Collection({
            title,
            caption,
            author,
            price, 
            currency,
            image: uploadedImage.secure_url,
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

router.get("/user", protectRoute, async (req, res)=>{
  try {
    const collections = await Collection.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(collections);
  } catch (error) {
    console.log("Get user collections error: ", error.message);
    res.status(500).json({ message: "Internal server error" });
  }
})

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
     if (collection && collection.image) {
      // Example: https://res.cloudinary.com/<cloud_name>/image/upload/v1234567890/collections/filename.jpg
      const urlParts = collection.image.split("/");
      const uploadIndex = urlParts.findIndex(part => part === "upload");
      // Get everything after 'upload/' and before file extension
      const publicIdWithVersion = urlParts.slice(uploadIndex + 1).join("/"); // collections/filename.jpg or v1234567890/collections/filename.jpg
      // Remove version if present (starts with 'v' and numbers)
      const publicId = publicIdWithVersion.replace(/v\d+\//, "").replace(/\.[^/.]+$/, ""); // collections/filename

      try {
        await cloudinary.uploader.destroy(publicId);
        console.log("Image deleted from Cloudinary:", publicId);
      } catch (err) {
        console.log("Cloudinary delete error:", err.message);
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
