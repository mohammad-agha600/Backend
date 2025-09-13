import express from 'express'
import { createCoupon,getCoupons,deleteCoupons, applyCoupon } from '../controllers/coupon.controller.js'
import {authenticateUser,authenticateAdmin} from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/',authenticateUser,authenticateAdmin,createCoupon)
router.get('/',authenticateUser,authenticateAdmin,getCoupons)
router.delete('/:code',authenticateUser,authenticateAdmin,deleteCoupons)
router.post('/apply',authenticateUser, applyCoupon);

export default router