import express from "express";
import { viewProducts, makeRequest, myRequests} from "../controllers/studentController.js";
import { verifyToken, checkRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/products", verifyToken, checkRole(["student"]), viewProducts);
router.post("/request", verifyToken, checkRole(["student"]), makeRequest);
router.get("/my-requests", verifyToken, checkRole(["student"]), myRequests);

export default router;