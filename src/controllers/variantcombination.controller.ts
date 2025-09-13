import { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';

// POST /api/product-variant-combination
export const createProductVariantCombination = async (req: Request, res: Response) => {
  const { productId, variantIds, stock, price, image } = req.body;

  if (!productId || !Array.isArray(variantIds) || variantIds.length === 0) {
    return res.status(400).json({ error: 'productId and variantIds are required' });
  }

  try {
    // Create combination
    const combo = await prisma.productVariantCombination.create({
      data: {
        productId,
        stock,
        price,
        image,
        variants: {
          create: variantIds.map((variantId: string) => ({
            variant: { connect: { id: variantId } },
          })),
        },
      },
      include: {
        variants: {
          include: {
            variant: true,
          },
        },
      },
    });

    res.status(201).json(combo);
  } catch (error) {
    console.error('Error creating product variant combination:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

// GET /api/product-variant-combination/:productId
export const getProductVariantCombinations = async (req: Request, res: Response) => {
  const { productId } = req.params;

  try {
    const combos = await prisma.productVariantCombination.findMany({
      where: { productId },
      include: {
        variants: {
          include: { variant: true },
        },
      },
    });

    res.json(combos);
  } catch (error) {
    console.error('Error fetching combinations:', error);
    res.status(500).json({ error: 'Something went wrong' });
  }
};

export const getAllVariantCombinations = async (_req: Request, res: Response) => {
  try {
    const combos = await prisma.productVariantCombination.findMany({
      include: {
        product: { select: { id: true, name: true, slug: true } },
        variants: { include: { variant: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ success: true, combinations: combos });
  } catch (error) {
    console.error("Error fetching all variant combinations:", error);
    res.status(500).json({ success: false, message: "Failed to fetch combinations" });
  }
};

export const getLowStockVariantCombinations = async (_req: Request, res: Response) => {
  try {
    const lowStock = await prisma.productVariantCombination.findMany({
      where: { stock: { lt: 5 } },
      include: {
        product: { select: { name: true, slug: true } },
        variants: { include: { variant: true } },
      },
      orderBy: { stock: 'asc' },
    });

    res.status(200).json({ success: true, lowStock });
  } catch (error) {
    console.error("Error fetching low stock combos:", error);
    res.status(500).json({ success: false, message: "Failed to fetch low stock variants" });
  }
};

export const updateVariantCombinationStock = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { stock } = req.body;

  if (typeof stock !== 'number' || stock < 0) {
    return res.status(400).json({ success: false, message: 'Stock must be a positive number' });
  }

  try {
    const updated = await prisma.productVariantCombination.update({
      where: { id },
      data: { stock },
    });

    res.status(200).json({ success: true, variantCombination: updated });
  } catch (error) {
    console.error("Error updating stock:", error);
    res.status(500).json({ success: false, message: "Failed to update stock" });
  }
};

export const restockVariantCombination = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ success: false, message: 'Quantity must be greater than 0' });
  }

  try {
    const restocked = await prisma.productVariantCombination.update({
      where: { id },
      data: {
        stock: {
          increment: quantity,
        },
      },
    });

    res.status(200).json({ success: true, variantCombination: restocked });
  } catch (error) {
    console.error("Error restocking variant:", error);
    res.status(500).json({ success: false, message: "Failed to restock" });
  }
};

