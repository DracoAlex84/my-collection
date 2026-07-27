import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Collection from "../models/Collections.js";
import protectRoute from "../middleware/auth.middleware.js";
import multer from "multer";
import { buildFilter, escapeRegex, getPagination, queryWithCount } from "../utils/getPublicIdFromUrl.js";

const router = express.Router();

// Multer configuration in system
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  fileFilter: (req, file, cb) => {
    // Log the field name to help debug
    console.log('Multer received file field:', file.fieldname);
    // Accept the file regardless of field name
    cb(null, true);
  }
});




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
    

    // Pagination
    const { page, limit, skip } = getPagination(req.query);

    const filter = buildFilter(req.query);

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

    const filter = buildFilter(req.query);

    filter.category = "figure";

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
    console.error("Error fetching figure collections:", error);
    res.status(500).json({ message: "Internal server error" });
  }
})

// Fetch manga collections
router.get("/mangas", protectRoute,  async (req, res) => {
  try {
    const { page, limit, skip } = getPagination(req.query);

    const filter = buildFilter(req.query);

    filter.category = "manga";

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
    console.error("Error fetching manga collections:", error);
    res.status(500).json({ message: "Internal server error" });
  }
})

// Fetch comic collections
router.get("/comics", protectRoute,  async (req, res) => {
  try {
     const { page, limit, skip } = getPagination(req.query);

    const filter = buildFilter(req.query);

    filter.category = "comic";

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
    console.error("Error fetching comic collections:", error);
    res.status(500).json({ message: "Internal server error" });
  }
})

// Fetch book collections
router.get("/books", protectRoute,  async (req, res) => {
  try {
     const { page, limit, skip } = getPagination(req.query);

    const filter = buildFilter(req.query);

    filter.category = "book";

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
    console.error("Error fetching book collections:", error);
    res.status(500).json({ message: "Internal server error" });
  }
})

// Fetch status collections
router.get("/statuses", protectRoute, async (req, res) => {
  try {

    const statuses = await Collection.distinct("status")
      .sort({ createdAt: -1})
      .populate("user", "username profilePicture");
      res.json(statuses);
  } catch (error) {
    console.error("Error fetching statuses:", error.message, error.stack);
    res.status(500).json({ message: "Internal server error" });
  }
})

// Create collection
router.post("/", protectRoute, upload.any(), async (req, res) => {
    try {
        const { title, caption, category, status, brand, author, price, currency, releaseDate, shoppingLink } = req.body;

        if (!title || !caption || !category || !status || !brand || !author || !price || !currency || !releaseDate || !shoppingLink) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: "Image file is required" });
        }

        const imageFile = req.files[0];

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
        const uploadedImage = await streamUpload(imageFile.buffer);

    // Build arrays of URLs and public ids
    const imagesUrls = [uploadedImage].map(r => r.secure_url);
    const imagesPublicIds = [uploadedImage].map(r => r.public_id);

    // Save collection to MongoDB
    const newCollection = new Collection({
      title,
      caption,
      author,
      price,
      currency,
      image: imagesUrls[0] || null, // legacy single image (first)
      imagePublicId: imagesPublicIds[0] || null,
      images: imagesUrls,
      imagePublicIds: imagesPublicIds,
      category,
      status,
      brand,
      releaseDate,
      shoppingLink,
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
router.put("/:id", protectRoute, upload.any(), async (req, res)=>{
  try {
      const { status, price, currency, brand, releaseDate, shoppingLink } = req.body;

      const collection = await Collection.findById(req.params.id);

      if (!collection) return res.status(404).json({ message: "Collection not found" });

      // Authorization
      if (collection.user.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "You are not authorized to modify this collection" });
      }

    // Keep existing values
    let uploadedImageUrl = collection.image;
    let uploadedImagePublicId = collection.imagePublicId;
    let uploadedImage = null;

      // If new image is provided, upload it to Cloudinary
      if (req.files && req.files.length > 0) {
        const imageFile = req.files[0];
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
        uploadedImage = await streamUpload(imageFile.buffer);
        uploadedImageUrl = uploadedImage.secure_url;
      }

    const imagesUrls = uploadedImage ? [uploadedImage].map(r => r.secure_url) : [uploadedImageUrl];
    const imagesPublicIds = uploadedImage ? [uploadedImage].map(r => r.public_id) : [uploadedImagePublicId];

    uploadedImageUrl = imagesUrls[0] || uploadedImageUrl;
    uploadedImagePublicId = imagesPublicIds[0] || uploadedImagePublicId;

    collection.images = imagesUrls;
    collection.imagePublicIds = imagesPublicIds;
    

    collection.brand = brand || collection.brand;
    collection.status = status || collection.status;
    collection.price = price || collection.price;
    collection.currency = currency || collection.currency;
    collection.image = uploadedImageUrl;
    collection.imagePublicId = uploadedImagePublicId;
    collection.releaseDate = releaseDate || collection.releaseDate;
    collection.shoppingLink = shoppingLink || collection.shoppingLink;

      
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

    // Delete images by public_id(s) if they exist
    try {
      if (collection && Array.isArray(collection.imagePublicIds) && collection.imagePublicIds.length > 0) {
        for (const publicId of collection.imagePublicIds) {
          try {
            await cloudinary.uploader.destroy(publicId);
            console.log("Image deleted from Cloudinary:", publicId);
          } catch (err) {
            console.log("Cloudinary delete error for", publicId, err.message);
          }
        }
      } else if (collection && collection.image) {
        // Fallback: parse public id from single image URL
        const urlParts = collection.image.split("/");
        const uploadIndex = urlParts.findIndex(part => part === "upload");
        const publicIdWithVersion = urlParts.slice(uploadIndex + 1).join("/");
        const publicId = publicIdWithVersion.replace(/v\d+\//, "").replace(/\.[^/.]+$/, "");
        try {
          await cloudinary.uploader.destroy(publicId);
          console.log("Image deleted from Cloudinary:", publicId);
        } catch (err) {
          console.log("Cloudinary delete error:", err.message);
        }
      }
    } catch (err) {
      console.log("Cloudinary deletion error:", err.message);
    }
    
    await collection.deleteOne();
    res.status(200).json({ message: "Collection deleted successfully" });
  } catch (error) {
    console.log("Error deleting collection:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
