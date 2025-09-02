import mongoose from "mongoose";

// Create a schema for the Collection model
const userSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    caption: {
        type: String,
        required: true,
    },
    brand: {
        type: String,
        required: true,
    },
    image: {
        type: String,
        required: true,
    },
    imagePublicId: {
        type: String,
    },
    author: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    currency: {
        type: String,
        enum: ["USD", "ARS", "JPY"],
        default: "ARS",
        required: true,
    },
    category: {
        type: String,
        enum: ["book", "manga", "comic", "figure"],
        default: "book",
        required: true,
    },
    status: {
        type: String,
        enum: ["owned", "whishlist", "preorder", "deposit"],
        default: "owned",
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    }

}, { timestamps: true });

const Collection = mongoose.model("Collection", userSchema);

export default Collection;