import express from 'express';
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  restockProduct,
  addVariantCombinations,
  updateProductCombinations,
  updateProductDetails,
  getProductBySlugOrName,
  
} from '../controllers/product.controller.js';
import { authenticateUser, authenticateAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public Routes
router.get('/', getAllProducts);
router.post("/:id/add-combinations",authenticateUser,authenticateAdmin, addVariantCombinations);
router.get('/:id', getProductById);

// Admin Routes 
router.post('/',authenticateUser,authenticateAdmin,createProduct);
router.put('/:id', authenticateUser, authenticateAdmin, updateProduct);
router.delete('/:id', authenticateUser, authenticateAdmin, deleteProduct);

router.put('/details/:id',authenticateUser,authenticateAdmin,updateProductDetails)
router.put('/update-combination/:id',authenticateUser,authenticateAdmin,updateProductCombinations)
router.get('/low-stock', authenticateUser, authenticateAdmin, getLowStockProducts);
router.put('/restock/:id', authenticateUser, authenticateAdmin, restockProduct);
router.get('/product/:slugOrName',getProductBySlugOrName)

export default router;