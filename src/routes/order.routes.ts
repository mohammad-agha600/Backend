import express from 'express'
import {createOrder,getUserOrders,getAllOrders, updateOrderStatus} from '../controllers/order.controller.js'

import {authenticateUser,authenticateAdmin} from '../middleware/auth.middleware.js'

const router = express.Router()

router.post('/',authenticateUser,createOrder)
router.get('/my-orders',authenticateUser,getUserOrders)
router.get('/all',authenticateUser,authenticateAdmin,getAllOrders)
router.put('/status/:id',authenticateUser,authenticateAdmin,updateOrderStatus)

export default router