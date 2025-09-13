import express from "express";
import {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory
} from "../controllers/category.controller.js";
import {
  authenticateAdmin,
  authenticateUser,
} from "../middleware/auth.middleware.js";
import { uploadCategoryImage } from "../middleware/uploadImage.js";
const router = express.Router();

router.get("/", getAllCategories);
router.post("/",authenticateUser,authenticateAdmin,uploadCategoryImage.single("image"), createCategory);
router.put('/:id',authenticateUser,authenticateAdmin,uploadCategoryImage.single("image"),updateCategory)
router.delete('/:id',authenticateUser,authenticateAdmin,deleteCategory)


export default router;
