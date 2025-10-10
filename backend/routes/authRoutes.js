import { Router } from "express";
import { login, me, register, updatePreferences, updateProfile } from "../controllers/authController.js";
import auth from "../middleware/auth.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth, me);
router.put("/preferences", auth, updatePreferences);
router.put("/profile", auth, updateProfile);

export default router;
