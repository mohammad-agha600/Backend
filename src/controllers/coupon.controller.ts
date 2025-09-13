import { Request, Response } from "express";
import prisma from "../config/prisma.js"; // no need for .js or .ts

// POST /api/coupons/apply
export const applyCoupon = async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ success: false, message: "Coupon code is required." });
  }

  try {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon) {
      return res.status(404).json({ success: false, message: "Coupon not found." });
    }

    // Check expiry
    if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
      return res.status(400).json({ success: false, message: "Coupon has expired." });
    }

    // Check usage limit
    if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
      return res.status(400).json({ success: false, message: "Coupon usage limit reached." });
    }

    return res.json({
      success: true,
      coupon: {
        code: coupon.code,
        discount: coupon.discount,
        type: coupon.type,
      },
    });

  } catch (err) {
    console.error("Apply coupon error:", err);
    res.status(500).json({ success: false, message: "Failed to apply coupon." });
  }
};

// Create coupon
export const createCoupon = async (req: Request, res: Response) => {
  const { code, discount, type, expiresAt, usageLimit } = req.body as {
    code: string;
    discount: number;
    type: "PERCENTAGE" | "FIXED"; // assuming enum or union
    expiresAt?: string;
    usageLimit?: number;
  };

  try {
    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(),
        discount,
        type,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        usageLimit,
      },
    });

    return res.status(201).json({ success: true, coupon });
  } catch (error) {
    console.error("Create coupon error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create coupon" });
  }
};

// Get all coupons
export const getCoupons = async (_req: Request, res: Response) => {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { createdAt: "desc" },
    });
    return res.status(200).json({ success: true, coupons });
  } catch (error) {
    console.error("Get coupons error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch coupons" });
  }
};

// Delete coupon by code
export const deleteCoupons = async (req: Request, res: Response) => {
  const { code } = req.params;

  try {
    await prisma.coupon.delete({
      where: { code: code.toUpperCase() },
    });

    return res
      .status(200)
      .json({ success: true, message: "Coupon deleted!" });
  } catch (error) {
    console.error("Delete coupon error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete coupon" });
  }
};
