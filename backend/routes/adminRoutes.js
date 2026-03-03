import express from "express";
import { addProduct, deleteProduct, updateStock} from "../controllers/adminController.js";
import { verifyToken, checkRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/add-product", verifyToken, checkRole(["admin"]), addProduct);
router.delete("/delete/:id", verifyToken, checkRole(["admin"]), deleteProduct);
router.put("/update-stock", verifyToken, checkRole(["admin"]), updateStock);

export default router;