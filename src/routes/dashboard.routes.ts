import express from 'express'
import {getAdminDashboard} from '../controllers/dashboard.controller.js'
import {authenticateUser,authenticateAdmin} from '../middleware/auth.middleware.js'

const router = express.Router()

router.get('/',authenticateUser,authenticateAdmin,getAdminDashboard)

export default router
