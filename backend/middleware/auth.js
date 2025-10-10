import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export default function auth(req, res, next) {
  // console.log("Auth middleware called for:", req.path);
  // console.log(
  //   "Authorization header:",
  //   req.headers.authorization ? "Present" : "Missing"
  // );

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    // console.log("No token found in request");
    return res.status(401).json({ message: "Missing Bearer token" });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // console.log("Token verified successfully, full payload:", payload);
    // console.log("JWT_SECRET exists:", !!JWT_SECRET);
    req.userId = payload.userId;
    return next();
  } catch (err) {
    console.log("Token verification failed:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
