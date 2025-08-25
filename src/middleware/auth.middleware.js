// Middleware connected to the authentication process
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const protectRoute = async (req, res, next) => {

    try {
      // get token
        const token = req.header("Authorization").replace("Bearer ", "");
        if (!token) return res.status(401).json({ message: "No authentication token, access denied" });

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Find the user by ID (adjust according to your JWT payload)
        const user = await User.findById(decoded.userId).select("-password");
        if (!user) return res.status(404).json({ message: "Token is not valid" });

        req.user = user; // Attach the user to the request object
        next(); // Call the next middleware or route handler

    } catch (error) {
        console.log("Authentication error:", error.message);
        res.status(401).json({ message: "Invalid token" });
    }

}

export default protectRoute;