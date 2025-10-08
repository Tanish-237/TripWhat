import { Router } from "express";
import auth from "../middleware/auth.js";
import {
  createTrip,
  listTrips,
  getTrip,
} from "../controllers/tripController.js";

const router = Router();

router.use(auth);

router.post("/", createTrip);
router.get("/", listTrips);
router.get("/:id", getTrip);

export default router;
