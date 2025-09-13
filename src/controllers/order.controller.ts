import prisma from '../config/prisma.js';
import { Request, Response } from "express";

interface PaginationQuery{
    page?:string;
    limit?:string
}
export const createOrder = async (req:Request, res:Response) => {
    const userId = req?.user?.userId;

    try {
        const {
            items,
            paymentMethod,
            shippingAddress,
            billingAddress,
            couponCode,
            shippingAmount,
        } = req.body;

        if (!userId || !Array.isArray(items) || items.length === 0 || !paymentMethod || !shippingAddress) {
            return res.status(400).json({ success: false, message: "Missing required fields" });
        }

        const phone = billingAddress?.phone ?? shippingAddress?.phone;
        const email = shippingAddress?.email ?? billingAddress?.email ?? null;

        if (typeof phone !== "string" || phone.trim() === "") {
            return res.status(400).json({ success: false, message: "Phone number is required" });
        }

        if (!shippingAddress.firstName || !shippingAddress.address || !shippingAddress.city || !shippingAddress.country) {
            return res.status(400).json({
                success: false,
                message: "Shipping address is incomplete"
            });
        }

        let totalAmount = 0;
        const orderItems = [];

        for (const item of items) {
            const { combinationId, productId, quantity } = item;

            if (!combinationId || !productId || !quantity) {
                return res.status(400).json({
                    success: false,
                    message: "Each item must have combinationId, productId, and quantity"
                });
            }

            const combination = await prisma.productVariantCombination.findUnique({
                where: { id: combinationId },
                include: {
                    variants: { include: { variant: true } }
                }
            });

            if (!combination || combination.price === null) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid or missing price for combination ID: ${combinationId}`
                });
            }

            if (combination.stock < quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for combination ID: ${combinationId}`
                });
            }

            const size = combination.variants.find(v => v.variant.key === "Size")?.variant.value;
            const color = combination.variants.find(v => v.variant.key === "Color")?.variant.value;

            if (!size || !color) {
                return res.status(400).json({
                    success: false,
                    message: `Size and color not found for combination ID: ${combinationId}`
                });
            }

            const product = await prisma.product.findUnique({ where: { id: productId } });

            if (!product) {
                return res.status(400).json({ success: false, message: `Product not found for ID: ${productId}` });
            }

            const discountPercent = product.discount || 0;
            const finalPrice = combination.price * (1 - discountPercent / 100);

            totalAmount += finalPrice * quantity;

            orderItems.push({
                productId,
                quantity,
                price: finalPrice,
                size,
                color,
            });
        }

        // Coupon processing
        let discountAmount = 0;
        let appliedCouponId;

        if (couponCode) {
            const coupon = await prisma.coupon.findUnique({ where: { code: couponCode } });

            if (!coupon) {
                return res.status(400).json({ success: false, message: "Invalid coupon code" });
            }

            appliedCouponId = coupon.id;
            discountAmount = coupon.type === "PERCENTAGE"
                ? (totalAmount * coupon.discount) / 100
                : coupon.discount;
        }

        const finalAmount = totalAmount - discountAmount + shippingAmount;

        // Create shipping address
        const createdShippingAddress = await prisma.shippingAddress.create({
            data: {
                firstName: shippingAddress.firstName,
                lastName: shippingAddress.lastName,
                address: shippingAddress.address,
                apartment: shippingAddress.apartment ?? "",
                city: shippingAddress.city,
                state: shippingAddress.state ?? "",
                postalCode: shippingAddress.postalCode ?? "",
                country: shippingAddress.country,
                phone: shippingAddress.phone,
            },
        });

        // Create billing address if provided
        let createdBillingAddress = null;
        if (billingAddress) {
            createdBillingAddress = await prisma.billingAddress.create({
                data: {
                    firstName: billingAddress.firstName || shippingAddress.firstName,
                    lastName: billingAddress.lastName || shippingAddress.lastName,
                    address: billingAddress.address || shippingAddress.address,
                    apartment: billingAddress.apartment ?? shippingAddress.apartment ?? "",
                    city: billingAddress.city || shippingAddress.city,
                    state: billingAddress.state ?? shippingAddress.state ?? "",
                    postalCode: billingAddress.postalCode ?? shippingAddress.postalCode ?? "",
                    country: billingAddress.country || shippingAddress.country,
                    phone: billingAddress.phone || shippingAddress.phone,
                },
            });
        }

        // Create the order
        const order = await prisma.order.create({
            data: {
                user: { connect: { id: userId } },
                totalAmount: finalAmount,
                discountAmount,
                shippingAmount,
                couponCode: couponCode ?? undefined,
                couponId: appliedCouponId,
                shippingAddress: { connect: { id: createdShippingAddress.id } },
                billingAddress: createdBillingAddress ? { connect: { id: createdBillingAddress.id } } : undefined,
                contactPhone: phone,
                contactEmail: email,
                paymentMethod,
                status: "pending",
                items: { create: orderItems },
            },
            include: {
                items: { include: { product: true } },
                shippingAddress: true,
                billingAddress: true,
                user: {
                    select: { id: true, email: true, username: true }
                }
            },
        });
        if (appliedCouponId) {
            await prisma.coupon.update({
              where: { id: appliedCouponId },
              data: {
                usageCount: { increment: 1 },
              },
            });
          }
        // Decrement stock
        for (const item of order.items) {
            await prisma.productVariantCombination.updateMany({
                where: {
                    productId: item.productId,
                    variants: {
                        every: {
                            OR: [
                                { variant: { key: "Size", value: item.size } },
                                { variant: { key: "Color", value: item.color } },
                            ],
                        },
                    },
                },
                data: { stock: { decrement: item.quantity } },
            });
        }

        // Clear cart
        await prisma.cartItem.deleteMany({
            where: { cart: { userId } },
        });

        return res.status(201).json({
            success: true,
            order: {
                ...order,
                shippingAddress: order.shippingAddress,
                billingAddress: order.billingAddress || null
            }
        });

    } catch (err) {
        if (err instanceof Error) {
          return res.status(500).json({ message: err.message });
        }
        return res.status(500).json({ message: "Unknown error" });
      }
};


export const getUserOrders = async (req:Request, res:Response) => {
    const userId = req?.user?.userId;
    try {
        const orders = await prisma.order.findMany({
            where: { userId },
            include: {
                items: { include: { product: true } },
                shippingAddress: true,
                billingAddress: true,
                user: {
                    select: {
                        id: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: "desc" },
        });

        return res.status(200).json({ 
            success: true, 
            orders: orders.map(order => ({
                ...order,
                billingAddress: order.billingAddress || null
            }))
        });
    } catch (error) {
        console.error("Get user orders error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Failed to fetch orders" 
        });
    }
};

export const getAllOrders = async (req:Request<{},{},{},PaginationQuery>,res:Response) => {
    const page = parseInt(String(req.query.page || '1'));
    const limit = parseInt(String(req.query.limit||'10'));
    const skip = (page - 1) * limit;
    
    try {
        const [orders, totalOrders] = await Promise.all([
            prisma.order.findMany({
                include: {
                    items: { include: { product: true } },
                    shippingAddress: true,
                    billingAddress: true,
                    user: {
                        select: {
                            id: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.order.count(),
        ]);

        return res.status(200).json({ 
            success: true, 
            orders: orders.map(order => ({
                ...order,
                billingAddress: order.billingAddress || null
            })),
            page,
            totalPages: Math.ceil(totalOrders / limit),
            totalOrders 
        });
    } catch (error) {
        console.error("Get all orders error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Failed to fetch all orders" 
        });
    }
};

export const updateOrderStatus = async (req:Request, res:Response) => {
    const { id } = req.params;
    const { status, trackingNumber, deliveredAt } = req.body;
    const validStatuses = ["pending", "processing", "shipped", "delivered", "cancelled"];
    
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: "Invalid status!" });
    }

    try {
        const updatedOrder = await prisma.order.update({
            where: { id },
            data: {
                status,
                trackingNumber,
                deliveredAt: deliveredAt ? new Date(deliveredAt) : undefined,
            },
            include: {
                items: { include: { product: true } },
                shippingAddress: true,
                billingAddress: true,
                user: {
                    select: {
                        id: true,
                        email: true
                    }
                }
            },
        });

        return res.status(200).json({ 
            success: true, 
            order: {
                ...updatedOrder,
                billingAddress: updatedOrder.billingAddress || null
            }
        });
    } catch (error) {
        console.error("Update order status error:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Failed to update order status!" 
        });
    }
};