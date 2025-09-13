import express from "express";
import {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
} from "../controllers/logos.controller.js";
import { authenticateAdmin, authenticateUser } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", getBanners);
router.post("/",authenticateUser,authenticateAdmin, createBanner);
router.put("/:id",authenticateUser,authenticateAdmin, updateBanner);
router.delete("/:id",authenticateUser,authenticateAdmin, deleteBanner);

export default router;
