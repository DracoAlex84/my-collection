import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Collection from "../models/Collections.js";
import protectRoute from "../middleware/auth.middleware.js";
import multer from "multer";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage});

// Creation route
router.post("/", protectRoute, upload.single("image"), async (req, res) => {
    try {
        const { title, caption, category, status, brand } = req.body;

        if (!title || !caption || !category || !status || !brand ) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Subir imagen a Cloudinary
        const result = await cloudinary.uploader.upload_stream(
            { folder: "collections" }, 
            async (error, uploadedImage) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                    return res.status(500).json({ message: "Image upload failed" });
                }

                const newCollection = new Collection({
                    title,
                    caption,
                    image: uploadedImage.secure_url,
                    category,
                    status,
                    brand,
                    user: req.user._id
                });

                await newCollection.save();
                res.status(201).json(newCollection);
            }
        );

        // Pasar el buffer a cloudinary
        result.end(req.file.buffer);

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
            totalPages: Math.ceil(totalCollections / limit)
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

        // Check if user is authorized to delete the collection
        if (collection.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to delete this collection" });
        }

        // Delete image from Cloudinary if it exists
        if (collection.image) {
            try {
                // Extract public ID from Cloudinary URL
                const parts = collection.image.split("/");
                const fileName = parts[parts.length - 1];
                const publicId = fileName.split(".")[0];
                await cloudinary.uploader.destroy(publicId);
                console.log("Image deleted from Cloudinary successfully");
            } catch (error) {
                console.log("Error deleting image from Cloudinary:", error);
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