import express from 'express'
import {authenticateUser} from '../middleware/auth.middleware.js'
import {createPaypalOrder,capturePaypalPayment} from '../controllers/payment.controller.js'

const router = express.Router()

router.post('/paypal/create',authenticateUser,createPaypalOrder)
router.post('/paypal/capture/:orderId',authenticateUser,capturePaypalPayment)

export default router