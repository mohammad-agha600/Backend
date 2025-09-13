import express from 'express';
import { updateSettings, getSettings } from '../controllers/setting.controller.js';
import { authenticateAdmin,authenticateUser } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', getSettings); // Get current settings
router.put('/', authenticateUser,authenticateAdmin,updateSettings); // Update settings

export default router;
