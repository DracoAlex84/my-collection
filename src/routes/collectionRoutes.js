import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Collection from "../models/Collections.js";
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// Creation route
router.post("/", protectRoute, async (req, res) => {
    try {
        const { title, caption, image, category, status, brand } = req.body;

        if (!title || !caption || !image || !category || !status || !brand) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Upload image to Cloudinary
        const result = await cloudinary.v2.uploader.upload(image);
        const imageUrl = result.secure_url;

        // Save to the database
        const newCollection = new Collection({
            title,
            caption,
            image: imageUrl,
            category,
            status,
            brand,
            user: req.user._id
        });

        await newCollection.save();

        res.status(201).json(newCollection);

    } catch (error) {
        console.log("Error creating collection:", error);
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