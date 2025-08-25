// Import mongoose to interact with MongoDB
import mongoose from "mongoose";

// Import bcrypt for password hashing
import bcrypt from "bcryptjs";

// Create a schema for the User model
const userSchema =  new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
        minlength: 6,
    },
    profilePicture: {
        type: String,
        default: "",
    }
}, { timestamps: true });

// Hash the password before saving the user
userSchema.pre("save", async function(next){

    if (!this.isModified("password")) {
        return next();
    }
    // Generate a salt and hash the password
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
})

// Compare password function
userSchema.methods.comparePassword = async function (userPassword){
    return await bcrypt.compare(userPassword, this.password);
}

// Create the User model using the schema
const User = mongoose.model("User", userSchema);


export default User;
