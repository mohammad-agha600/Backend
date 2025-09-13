import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";


import productRoutes from "./routes/product.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import orderRoutes from "./routes/order.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import variantRoutes from "./routes/variant.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import tagRoutes from "./routes/tag.routes.js";
import couponRoutes from "./routes/coupon.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import importRoutes from "./routes/import.routes.js";
import authRoutes from './routes/auth.routes.js'
import logosRoutes from './routes/logos.routes.js'
import wishlistRoutes from './routes/wishlist.routes.js'
import settingRoutes from './routes/setting.routes.js'
import variantcombinationroutes from './routes/variantCombination.routes.js'
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


app.use(cors({
    origin:process.env.FRONTEND_URL,
    credentials:true,
    methods:['GET','POST','PUT','DELETE','OPTIONS'],
    allowedHeaders:['Content-Type','Authorization']
}));
app.use(express.json({limit:"100mb"}));
app.use(cookieParser());
app.use(express.urlencoded({limit:"100mb",extended:true}))

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/variants", variantRoutes);
app.use("/api/variantcombination", variantcombinationroutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/coupons", couponRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/import", importRoutes);
app.use('/api/logos',logosRoutes)
app.use('/api/wishlist',wishlistRoutes)
app.use('/api/settings',settingRoutes)
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  

export default app;
//aa
