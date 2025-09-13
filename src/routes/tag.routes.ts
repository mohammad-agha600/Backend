import express from 'express';
import {
  createTag,
  deleteTag,
  getAllFlatTags,
  getAllTags,
  updateTag,
} from '../controllers/tag.controller.js';
import { authenticateAdmin, authenticateUser } from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', getAllTags);
router.post('/', authenticateUser, authenticateAdmin, createTag);
router.put('/:id', authenticateUser, authenticateAdmin, updateTag);
router.delete('/:id', authenticateUser, authenticateAdmin, deleteTag);
router.get("/flat", getAllFlatTags);


export default router;
