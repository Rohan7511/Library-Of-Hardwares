import express from "express";
import { viewPending, approveRequest, acceptReturn} from "../controllers/operatorController.js";
import { verifyToken, checkRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/pending", verifyToken, checkRole(["operator"]), viewPending);
router.post("/approve", verifyToken, checkRole(["operator"]), approveRequest);
router.post("/return", verifyToken, checkRole(["operator"]), acceptReturn);

export default router;