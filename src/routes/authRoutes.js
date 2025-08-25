import express from 'express';
// Import the User model
import User from '../models/User.js';
// Import JWT for token generation
import jwt from 'jsonwebtoken';

const router = express.Router();

// Function to generate a JWT token
const generateToken = (userId) => {
    // Sign the token with the user ID and secret key
    return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '30d' });
}

const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isStrongPassword(password) {
    // At least 1 lowercase, 1 uppercase, 1 number, 1 special character, and 6+ chars
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/.test(password);
}

router.post("/register", async (req, res) => {
    // Handle user registration
    try {
        // Extract user data from request body
        const { email, username,     password } = req.body;

        // Validate user data
        if (!username || !email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ message: "Invalid email format" });
        }

        if (!isStrongPassword(password) || password.length < 6) {
            return res.status(400).json({ message: "Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character." });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ $or: [{ username }] });
        if (existingUser) {
            return res.status(400).json({ message: "Username already exists" });
        }

        const existingEmail = await User.findOne({ $or: [ { email }] });
        if (existingEmail) {
            return res.status(400).json({ message: "Email already exists" });
        }

        // Get random avatar for profile picture
        const profilePicture = req.body.profilePicture || `https://api.dicebear.com/9.x/adventurer-neutral/svg?seed=${username}`;

        // If validation passes, create a new user
        const user = new User({
            username,
            email,
            password,
            profilePicture
        })

        // Save the user to the database
        await user.save();

        // Function to generate a JWT token
        const token = generateToken(user._id);

        // Send the token in the response
        res.status(201).json({ 
            token,
            // Send user data without password
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture,
                createdAt: user.createdAt,
            }, 
        });

    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Internal server error" });        
    }
});

router.post("/login", async (req, res) => {
    // Handle user login
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        // Check if password matches
        const isPasswordCorrect = await user.comparePassword(password);
        if(!isPasswordCorrect) return res.status(400).json({ message: "Invalid credentials" });

        const token = generateToken(user._id);

         res.status(200).json({ 
            token,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                profilePicture: user.profilePicture,
                createdAt: user.createdAt,
            } 
        });
    } catch (error) {
        console.log("Login error:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});



export default router;

