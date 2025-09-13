import express from 'express'
import { loginUser, registerUser,getUsers,logoutUser,updateUser, syncGoogleUser } from '../controllers/auth.controller.js'
import {authenticateUser,authenticateAdmin} from '../middleware/auth.middleware.js'

const router = express.Router()



router.post('/register',registerUser)
router.post('/google',syncGoogleUser)
router.post('/backend-login',loginUser)
router.get('/getUsers',authenticateUser,authenticateAdmin,getUsers)
router.post('/logout',authenticateUser,logoutUser)
router.put('/updateUser/:id',authenticateUser,updateUser)


export default router