import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

export const addToWishlist = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
  const { productId } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (!productId) {
    return res.status(400).json({ success: false, message: "Product ID is required" });
  }

  try {
    const productExists = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!productExists) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const wishlistItem = await prisma.wishlist.upsert({
      where: {
        userId_productId: {
        userId,
          productId,
        },
      },
      update: {},
      create: {
        userId,
        productId,
      },
    });

    return res.status(200).json({ success: true, wishlistItem });
  } catch (error) {
    console.error("Wishlist error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add to wishlist",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getUserWishlist = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
  
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
  
    try {
      const wishlistItems = await prisma.wishlist.findMany({
        where: { userId },
        include: {
          product: {
            include: {
              category: true,
              productTags: {
                include: { tag: true },
              },
              images: true,
              variantCombinations: {
                include: {
                  variants: {
                    include: { variant: true },
                  },
                },
              },
            },
          },
        },
      });
  
      return res.status(200).json({ success: true, wishlist: wishlistItems });
    } catch (error) {
      console.error("Get wishlist error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to get wishlist",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
  export const removeFromWishlist = async (req: Request, res: Response) => {
    const userId = req.user?.userId;
    const { productId } = req.body;
  
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
  
    if (!productId) {
      return res.status(400).json({ success: false, message: "Product ID is required" });
    }
  
    try {
      await prisma.wishlist.delete({
        where: {
          userId_productId: {
            userId,
            productId,
          },
        },
      });
  
      return res.status(200).json({ success: true, message: "Removed from wishlist" });
    } catch (error) {
      console.error("Remove wishlist error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to remove from wishlist",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };
    