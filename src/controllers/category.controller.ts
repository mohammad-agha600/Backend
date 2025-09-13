import { Request, Response } from "express";
import prisma from "../config/prisma.js"; // No `.js` needed in TS, unless you're compiling to CommonJS
import cloudinary from "../config/cloudinary.js";
import fs from "fs";

// Create category
export const createCategory = async (req: Request, res: Response) => {
  const { name } = req.body as { name: string };
  const imageFile = req.file?.path;

  try {
    let imageUrl: string | undefined;

    if (imageFile) {
      const uploadedImage = await cloudinary.uploader.upload(imageFile, {
        folder: "categories",
      });
      imageUrl = uploadedImage.secure_url;
    }

    const category = await prisma.category.create({
      data: {
        name,
        image: imageUrl,
      },
    });

    return res.status(201).json({ success: true, category });
  } catch (error) {
    console.error("Create category error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create category" });
  }
};

// Get all categories
export const getAllCategories = async (req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    return res.status(200).json({ success: true, categories });
  } catch (error) {
    console.error("Fetch categories error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch categories" });
  }
};

// Update category
export const updateCategory = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body as { name: string };
  const imageFile = req.file?.path;

  try {
    let imageUrl: string | undefined;

    if (imageFile) {
      const uploadedImage = await cloudinary.uploader.upload(imageFile, {
        folder: "categories",
      });
      imageUrl = uploadedImage.secure_url;

    
    }

    const updated = await prisma.category.update({
      where: { id },
      data: {
        name,
        ...(imageUrl && { image: imageUrl }),
      },
    });

    return res.status(200).json({ success: true, category: updated });
  } catch (error) {
    console.error("Update category error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Update failed" });
  }
};

// Delete category
export const deleteCategory = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const existing = await prisma.category.findUnique({ where: { id } });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Category not found" });
    }

    await prisma.category.delete({ where: { id } });

    return res.status(200).json({ success: true, message: "Category deleted" });
  } catch (error) {
    console.error("Delete category error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Delete failed" });
  }
};
