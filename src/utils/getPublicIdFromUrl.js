const getPublicIdFromUrl = async (url) =>{
    if (!url) return null;

    const urlParts = url.split("/");
    const uploadIndex = urlParts.findIndex(part => part === "upload");
    if (uploadIndex === -1) return null;

    // Everything that is past upload
    const publicIdWithVersion = urlParts.slice(uploadIndex + 1).join("/");
    // Remove version (ej: v1234567890/) and extenssion (.jpg, .png, etc.)
    const publicId = publicIdWithVersion
        .replace(/v\d+\//, "")
        .replace(/\.[^/.]+$/, "");

    return publicId; 
}

export default getPublicIdFromUrl;