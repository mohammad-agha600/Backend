// middleware/uploadImage.ts
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import cloudinary from '../config/cloudinary.js';

// 🔹 For Product Images
const productImageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'productImages',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: undefined,
  }),
});

// 🔹 For Banners
const bannerStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'banners',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation:undefined,
  }),
});

// 🔹 For Category Images
const categoryImageStorage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'categories',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
    transformation: undefined,
  }),
});



export const uploadCategoryImage = multer({ storage: categoryImageStorage });
export const uploadProductImage = multer({ storage: productImageStorage });
export const uploadBanner = multer({ storage: bannerStorage });
