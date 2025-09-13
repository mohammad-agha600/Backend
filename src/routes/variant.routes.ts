import { Router } from 'express';
import {
  createVariant,
  getAllVariants,
  updateVariant,
  deleteVariant,
} from '../controllers/variant.controller.js';

import { authenticateUser,authenticateAdmin } from '../middleware/auth.middleware.js';
const router = Router();

router.post('/',authenticateUser,authenticateAdmin, createVariant);
router.get('/', getAllVariants);
router.put('/:id',authenticateUser,authenticateAdmin, updateVariant);
router.delete('/:id',authenticateUser,authenticateAdmin, deleteVariant);

export default router;