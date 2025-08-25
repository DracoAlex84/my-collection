import express from "express";
// Import cloudinary configuration
import cloudinary from "../lib/cloudinary.js";
// Import the model for collection
import Collection from "../models/Collections.js"
// Import the authentication middleware
import protectRoute from "../middleware/auth.middleware.js";

const router = express.Router();

// Creation route
router.post("/", protectRoute, async (req, res)=>{
    try {
        const { title, caption, image, category, status, brand } = req.body;

        if(!title || !caption || !image || !category || !status || !brand) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Upload image to Cloudinary
        const result = await cloudinary.uploader.upload(image)
        const imageUrl = result.secure_url;
        
        // Save to the database
        const newCollection = new Collection({
            title,
            caption,
            image: imageUrl,
            category,
            status,
            brand,
            user: req.user._id // Attach the authenticated user's ID
        })

        await newCollection.save();

        res.status(201).json(newCollection);
        
    } catch (error) {
        console.log("Error creating collection:", error);
        res.status(500).json({ message: "Internal server error" });
    }
})

// Fetch all collections route with pagination
router.get("/", protectRoute, async (req, res) =>{
    try {

        const page = req.query.page || 1; // Default to page 1
        const limit = 10; // Number of collections per page
        const skip = (page - 1) * limit; // Calculate the number of documents to skip

        // Fetch collections from the database
        const collections = await Collection.find().sort({ createdAt: -1})//Descending order by creation date
        .skip(skip)
        .limit(limit)
        // Method from mongoose to populate the user field with username and profile picture
        .populate("user", "username profilePicture"); // Populate user details; 

        const totalCollections = await Collection.countDocuments(); // Get total number of collections

        res.send({
            collections,
            currentPage: page,
            totalCollections,
            totalPages: Math.ceil(totalCollections / limit)
        });

    }catch (error) {
        console.log("Error fetching collections:", error);
        res.status(500).json({ message: "Internal server error"})
    }
})

router.delete("/:id", protectRoute, async (req, res) =>{
    try {
        const collection = req.params.id;
        if(!collection) res.status(400).json({ message: "Collection ID not found"});

        // Check if user is authorized to delete the collection
        if (collection.user.toString() !== req.user._id.toString()) { // Ensure the user created the collection
            return res.status(403).json({ message: "You are not authorized to delete this collection" });
        }

        // Delete image from Cloudinary
        if (collection.image && collection.image.includes("cloudinary")) {
            try{
                const publicId = collection.image.split("/").pop().split(".")[0]; // Extract public ID from URL
                await cloudinary.uploader.destroy(publicId);    
                console.log("Image deleted from Cloudinary successfully");
                
            } catch (error) {
                console.log("Error deleting image from Cloudinary:", error);
            }
        }

        await collection.deleteOne();

        res.status(200).json({ message: "Collection deleted successfully" });
        
    } catch (error){
        console.log("Error deleting collection:", error);
        res.status(500).json({ message: "Internal server error" });        
    }
})


export default router;