import prisma from "../config/prisma.js";
import { Request,Response } from "express";
// Dashboard metrics
export const getAdminDashboard = async (req: Request, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    const [
      totalSales,
      totalOrders,
      totalUsers,
      totalProducts,
      pendingOrders,
      lowStock,
      topProducts,
      salesByDay,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: {
          createdAt: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
        _sum: { totalAmount: true },
      }),
      prisma.order.count(),
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.count({ where: { status: "pending" } }),
      prisma.product.findMany({
        where: { stock: { lt: 5 } },
        select: { id: true, name: true, stock: true },
      }),
      prisma.orderItem.groupBy({
        by: ["productId"],
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 5,
      }),
      prisma.order.groupBy({
        by: ["createdAt"],
        _sum: { totalAmount: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalSales: totalSales._sum.totalAmount || 0,
        totalOrders,
        totalUsers,
        totalProducts,
        pendingOrders,
        lowStock,
        topProducts,
        salesByDay,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to load dashboard metrics" });
  }
};

