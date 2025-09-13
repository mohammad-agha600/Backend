import express from 'express'
import {getCart,addToCart,removeFromCart,updateCartItem} from '../controllers/cart.controller.js'

import {authenticateUser} from '../middleware/auth.middleware.js'

const router = express.Router()

router.get('/',authenticateUser,getCart)
router.post('/',authenticateUser,addToCart)
router.put('/:itemId',authenticateUser,updateCartItem)
router.delete('/:itemId',authenticateUser,removeFromCart)


export default router