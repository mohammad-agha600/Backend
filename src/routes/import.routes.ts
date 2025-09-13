import express from 'express'
import multer from 'multer'
import { importProducts } from '../controllers/import.controller.js'
import { authenticateUser, authenticateAdmin } from '../middleware/auth.middleware.js'
import path from 'path'

const upload = multer({ storage: multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`)
}) });

const router = express.Router()

router.post('/products', authenticateUser, authenticateAdmin, upload.single('file'), importProducts)
export default router