import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Collection from "../models/Collections.js";
import protectRoute from "../middleware/auth.middleware.js";
import multer from "multer";
import { escapeRegex, getPagination, queryWithCount } from "../utils/getPublicIdFromUrl.js";

const router = express.Router();

// Multer configuration in system
const storage = multer.memoryStorage();
const upload = multer({ storage });




router.get("/user", protectRoute, async (req, res) => {
  try {
    const collections = await Collection.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .populate("user", "username profilePicture");

    res.json(collections);
  } catch (error) {
    console.error("Error fetching user collections:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});


// Fetch all collections created by user
router.get("/",  protectRoute, async (req, res) => {
  try {
    const rawQ = (req.query.q || "").trim();
    const rawName = (req.query.name || "").trim();
    const rawBrand = (req.query.brand || "").trim();
    const rawAuthor = (req.query.author || "").trim();
    const rawStatus = (req.query.status || "").trim();

    // Pagination
    const { page, limit, skip } = getPagination(req.query);

    let filter = {}

    if (rawQ) {
      const re = new RegExp(escapeRegex(rawQ.slice(0, 100)), "i");
      filter.$or = [
        { title: { $regex: re} },
        { author: { $regex: re} },
        { brand: { $regex: re} }
      ]
    }
    
    if (rawName) {
      filter.title = { $regex: new RegExp(escapeRegex(rawName.slice(0, 100)), "i") };
    }
    if (rawBrand) {
      filter.brand = { $regex: new RegExp(escapeRegex(rawBrand.slice(0, 100)), "i") };
    }
    if (rawAuthor) {
      filter.author = { $regex: new RegExp(escapeRegex(rawAuthor.slice(0, 100)), "i") };
    }
    if (rawStatus) {
      filter.status = { $regex: new RegExp(escapeRegex(rawStatus.slice(0, 100)), "i") };
    }

    const { results: collections, total } =
      await queryWithCount(Collection, filter, null, skip, limit);

    res.json({
      collections,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });

  } catch (error) {
    console.error("Get collections error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Fetch figure collections
router.get("/figures", protectRoute,  async (req, res) => {
  try {

    const { page, limit, skip } = getPagination(req.query);

    const { results: collections, total } =
      await queryWithCount(Collection, { category: "figure" }, null, skip, limit);

    res.json({
      collections,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching figure collections:", error);
    res.status(500).json({ message: "Internal server error" });
  }
})

// Fetch manga collections
router.get("/mangas", protectRoute,  async (req, res) => {
  try {
    const mangaCollections = await Collection.find({ category: "manga"})
      .sort({ createdAt: -1})
      .populate("user", "username profilePicture");
      res.json(mangaCollections);
  } catch (error) {
    console.error("Error fetching manga collections:", error);
    res.status(500).json({ message: "Internal server error" });
  }
})

// Fetch comic collections
router.get("/comics", protectRoute,  async (req, res) => {
  try {
    const comicCollections = await Collection.find({ category: "comic"})
      .sort({ createdAt: -1})
      .populate("user", "username profilePicture");
      res.json(comicCollections);
  } catch (error) {
    console.error("Error fetching comic collections:", error);
    res.status(500).json({ message: "Internal server error" });
  }
})

// Fetch brand collections
router.get("/brands", protectRoute,  async (req, res) => {
  try {

    const { page, limit, skip } = getPagination(req.query);

    const { results: collections, total } =
      await queryWithCount(Collection.distinct("brand"), null, skip, limit);

      
    res.json({
      collections,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching brand collections:", error);
    res.status(500).json({ message: "Internal server error" });
  }
})

// Create collection
router.post("/", protectRoute, upload.single("image"), async (req, res) => {
    try {
        const { title, caption, category, status, brand, author, price, currency } = req.body;

        if (!title || !caption || !category || !status || !brand || !author || !price || !currency) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Image file is required" });
        }

        // Upload image to Cloudinary using buffer
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

        // Upload image to Cloudinary
        const uploadedImage = await streamUpload(req.file.buffer);

        // Save collection to MongoDB
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

// Get single collection by ID
router.get("/:id", protectRoute, async (req, res)=>{
  try {
    const collection = await Collection.findById(req.params.id).populate("user", "username profilePicture");
    if (!collection) return res.status(404).json({ message: "Collection not found" });
    res.json(collection); 
  } catch (error) {
    console.error("Error fetching collection:", error);
    res.status(500).json({ message: "Internal server error" });
  }
})


//Modify collection
router.put("/:id", protectRoute, upload.single("image"), async (req, res)=>{
  try {
      const { status, price, currency } = req.body;

      const collection = await Collection.findById(req.params.id);

      if (!collection) return res.status(404).json({ message: "Collection not found" });

      // Authorization
      if (collection.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "You are not authorized to modify this collection" });
      }

      // Keep actual image
      let uploadedImageUrl = collection.image

      // If new image is provided, upload it to Cloudinary
      if (req.file) {
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

        // Upload image to Cloudinary
        const uploadedImage = await streamUpload(req.file.buffer);
        uploadedImageUrl = uploadedImage.secure_url;
      }

      collection.status = status || collection.status;
      collection.price = price || collection.price;
      collection.currency = currency || collection.currency;
      collection.image = uploadedImageUrl;

      
      await collection.save();
      res.status(200).json(collection);

  } catch (error) {
    console.error("Error modifying collection:", error);
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

    // Authorization
    if (collection.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You are not authorized to delete this collection" });
    }

    // Delete image by public_id if it exist
    
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
