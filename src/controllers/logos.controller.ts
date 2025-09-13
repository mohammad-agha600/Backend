import { Request, Response } from 'express';
import prisma from '../config/prisma.js';
import { uploadBanner } from '../middleware/uploadImage.js';

export const getBanners = async (_req: Request, res: Response) => {
  try {
    const banners = await prisma.banner.findMany({ orderBy: { position: 'asc' } });
    res.json(banners);
  } catch (error) {
    console.error('Error fetching banners:', error);
    res.status(500).json({ message: 'Error fetching banners' });
  }
};

export const createBanner = [
  uploadBanner.single('image'),
  async (req: Request, res: Response) => {
    const { title, subheading, paragraph, linkUrl, position, active } = req.body;
    const imageUrl = req.file?.path || req.body.imageUrl || '';

    try {
      const banner = await prisma.banner.create({
        data: {
          title,
          subheading,
          paragraph,
          imageUrl,
          linkUrl,
          position: parseInt(position),
          active: active === 'true' || active === true,
        },
      });
      res.status(201).json(banner);
    } catch (error) {
      console.error('Error creating banner:', error);
      res.status(500).json({ message: 'Error creating banner' });
    }
  }
];

export const updateBanner = [
  uploadBanner.single('image'),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, subheading, paragraph, linkUrl, position, active } = req.body;
    const imageUrl = req.file?.path || req.body.imageUrl;

    try {
      const updated = await prisma.banner.update({
        where: { id },
        data: {
          title,
          subheading,
          paragraph,
          imageUrl,
          linkUrl,
          position: parseInt(position),
          active: active === 'true' || active === true,
        },
      });
      res.json(updated);
    } catch (error) {
      console.error('Error updating banner:', error);
      res.status(500).json({ message: 'Error updating banner' });
    }
  }
];

export const deleteBanner = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await prisma.banner.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting banner:', error);
    res.status(500).json({ message: 'Error deleting banner' });
  }
};