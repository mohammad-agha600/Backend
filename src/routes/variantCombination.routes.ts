import express from 'express';
import {
  createProductVariantCombination,
  getProductVariantCombinations,
  getAllVariantCombinations,
  getLowStockVariantCombinations,
  updateVariantCombinationStock,
  restockVariantCombination
} from '../controllers/variantcombination.controller.js';

import { authenticateUser, authenticateAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Create new variant combinations
router.post('/', authenticateUser, authenticateAdmin, createProductVariantCombination);

// Get all combinations of a specific product
router.get('/:productId', getProductVariantCombinations);

//  Get all combinations (for admin stock dashboard)
router.get('/', getAllVariantCombinations);

//  Low stock combinations (variant-level alerting)
router.get('/low-stock/all', authenticateUser, authenticateAdmin, getLowStockVariantCombinations);

//  Overwrite stock for a variant combination
router.put('/stock/:id', authenticateUser, authenticateAdmin, updateVariantCombinationStock);

//  Increment/restock stock for a variant combination
router.put('/restock/:id', authenticateUser, authenticateAdmin, restockVariantCombination);

export default router;
