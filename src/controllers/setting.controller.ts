import { Request, Response } from 'express';
import prisma from '../config/prisma.js';

// GET /api/settings
export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findFirst();
    res.json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch settings.' });
  }
};

// PUT /api/settings
export const updateSettings = async (req: Request, res: Response) => {
  try {
    const { currency, shippingRate, dhlCharge } = req.body;

    const existing = await prisma.setting.findFirst();

    let updated;
    if (existing) {
      updated = await prisma.setting.update({
        where: { id: existing.id },
        data: {
          currency,
          shippingRate: parseFloat(shippingRate),
          dhlCharge: parseFloat(dhlCharge),
        },
      });
    } else {
      updated = await prisma.setting.create({
        data: {
          currency,
          shippingRate: parseFloat(shippingRate),
          dhlCharge: parseFloat(dhlCharge),
        },
      });
    }

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update settings.' });
  }
};
