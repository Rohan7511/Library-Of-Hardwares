import express from "express";
import { addProduct, deleteProduct, updateStock, viewAllRequests } from "../controllers/adminController.js";
import { viewProducts } from "../controllers/studentController.js";
import { verifyToken, checkRole } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/add-product", verifyToken, checkRole(["admin"]), addProduct);
router.delete("/delete/:id", verifyToken, checkRole(["admin"]), deleteProduct);
router.put("/update-stock", verifyToken, checkRole(["admin"]), updateStock);
router.get("/products", verifyToken, checkRole(["admin"]), viewProducts);
router.get("/requests", verifyToken, checkRole(["admin"]), viewAllRequests);

export default router;