import { Request, Response } from "express";
import prisma from "../config/prisma.js";

// GET current user's cart
export const getCart = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized: no user ID" });
  }

  try {
    const cart = await prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                image: true,
                price: true,
                discount: true,
              },
            },
            combination: {
              include: {
                variants: {
                  include: {
                    variant: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      return res.status(200).json({ success: true, cart: { items: [] } });
    }

    const transformedItems = cart.items.map((item) => {
      const variantInfo = item.combination?.variants.reduce((acc, curr) => {
        acc[curr.variant.key.toLowerCase()] = curr.variant.value;
        return acc;
      }, {} as Record<string, string>);

      return {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        combinationId: item.combinationId,
        size: variantInfo?.size || null,
        color: variantInfo?.color || null,
        product: item.product,
        variant: item.combination
          ? {
              id: item.combination.id,
              stock: item.combination.stock,
              price: item.combination.price,
              variants: item.combination.variants.map((v) => ({
                key: v.variant.key,
                value: v.variant.value,
              })),
            }
          : undefined,
      };
    });

    return res.status(200).json({
      success: true,
      cart: {
        ...cart,
        items: transformedItems,
      },
    });
  } catch (error) {
    console.error("get cart error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch cart",
    });
  }
};


// Add item to cart

// Add item to cart
export const addToCart = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  const { productId, quantity, combinationId, size, color } = req.body;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ success: false, message: "Quantity must be greater than zero" });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variantCombinations: {
          where: combinationId ? { id: combinationId } : undefined,
          include: {
            variants: {
              include: {
                variant: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found!" });
    }

    let combination = null;
    if (combinationId) {
      combination = product.variantCombinations?.[0];
      if (!combination) {
        return res.status(400).json({ success: false, message: "Invalid variant combination" });
      }
    }

    const availableStock = combination ? combination.stock : product.stock;
    if (availableStock < quantity) {
      return res.status(400).json({ success: false, message: "Insufficient stock" });
    }

    let cart = await prisma.cart.findUnique({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId } });
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId,
        combinationId: combinationId || null,
      },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;

      if (availableStock < newQuantity) {
        return res.status(400).json({ success: false, message: "Exceeds available stock" });
      }

      const updatedItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          ...(size && { size }),
          ...(color && { color }),
        },
      });

      return res.status(200).json({ success: true, item: updatedItem });
    } else {
      const newItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          combinationId,
          ...(size && { size }),
          ...(color && { color }),
        },
      });

      return res.status(201).json({ success: true, item: newItem });
    }
  } catch (error) {
    console.error("Add to cart error", error);
    return res.status(500).json({
      success: false,
      message: "Failed to add to cart",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

// Remove from cart
export const removeFromCart = async (req: Request, res: Response) => {
  const { itemId } = req.params;

  try {
    await prisma.cartItem.delete({ where: { id: itemId } });
    return res.status(200).json({ success: true, message: "Item removed!" });
  } catch (error) {
    console.error("Remove from cart error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to remove from cart" });
  }
};

// Update cart item quantity
export const updateCartItem = async (req: Request, res: Response) => {
  const { itemId } = req.params;
  const { quantity } = req.body as { quantity: number };

  try {
    const updatedItem = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    return res.status(200).json({ success: true, item: updatedItem });
  } catch (error) {
    console.error("Update cart item error", error);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update item!" });
  }
};
