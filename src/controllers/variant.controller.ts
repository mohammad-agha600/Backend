import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
// Import the Variant type from Prisma client
import { Variant } from '@prisma/client';

export const createVariant = async (req: Request, res: Response) => {
  const { key, value } = req.body;

  if (!key || !value) {
    return res.status(400).json({ success: false, message: 'Key and value are required' });
  }

  try {
    const existing = await prisma.variant.findUnique({
      where: { key_value: { key, value } },
    });

    if (existing) {
      return res.status(409).json({ success: false, message: 'Variant already exists' });
    }

    const variant = await prisma.variant.create({
      data: { key, value },
    });

    res.status(201).json({ success: true, variant });
  } catch (err) {
    console.error('Create Variant Error:', err);
    res.status(500).json({ success: false, message: 'Failed to create variant' });
  }
};

export const getAllVariants = async (_req: Request, res: Response) => {
  try {
    const variants = await prisma.variant.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const grouped = variants.reduce((acc: Record<string, Variant[]>, variant) => {
      if (!acc[variant.key]) {
        acc[variant.key] = [];
      }
      acc[variant.key].push(variant);
      return acc;
    }, {});

    res.status(200).json({ success: true, variants: grouped });
  } catch (err) {
    console.error('Get Variants Error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch variants' });
  }
};

export const updateVariant = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { key, value } = req.body;

  if (!key || !value) {
    return res.status(400).json({ success: false, message: 'Key and value are required' });
  }

  try {
    const variant = await prisma.variant.update({
      where: { id },
      data: { key, value },
    });

    res.status(200).json({ success: true, variant });
  } catch (err) {
    console.error('Update Variant Error:', err);
    res.status(500).json({ success: false, message: 'Failed to update variant' });
  }
};

import { Prisma } from "@prisma/client";

export const deleteVariant = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    await prisma.variant.delete({ where: { id } });
    return res.status(200).json({ success: true, message: 'Variant deleted' });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete variant — it is in use by product combinations.',
      });
    }

    console.error('Delete Variant Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete variant' });
  }
};
