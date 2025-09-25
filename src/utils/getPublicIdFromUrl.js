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

export function escapeRegex (text="") {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

export function getPagination  (query) {
  const page = Math.max(parseInt(query.page) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit) || 10, 1), 100);
  const skip = (page - 1) * limit; 

  return { page, limit, skip}; 
}

export async function queryWithCount(model, filter,  skip, limit) {
  const [results, total] = await Promise.all([
    model.find(filter)
         .sort({ createdAt: -1 })   // o configurable
         .skip(skip)
         .limit(limit)
         .populate("user", "username profilePicture")
         .lean(),
    model.countDocuments(filter)
  ]);

  return { results, total };
}

export function buildFilter(query, searchableFields = ["title", "author", "brand"]) {
  let filter = {};
  
  const normalized = Object.fromEntries(
    Object.entries(query).map(([key, value]) => [key, (value || "").trim()])
  );

  if (normalized.q) {
    const re = new RegExp(escapeRegex(normalized.q.slice(0, 100)), "i");
    filter.$or = searchableFields.map(field => ({ [field]: { $regex: re } }));
  }

   if (normalized.status) {
    filter.status = { $regex: new RegExp(escapeRegex(normalized.status.slice(0, 100)), "i") };
  }

  return filter;
}