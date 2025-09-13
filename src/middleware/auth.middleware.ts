
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface UserPayload {
  userId: string;
  isAdmin: boolean;
  [key: string]: any;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: UserPayload;
  }
}

export const authenticateUser = (req: Request, res: Response, next: NextFunction) => {
  let token: string | undefined;

  // First try to get token from Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // Fallback to cookie if header is missing
  if (!token && req.cookies?.cookietoken) {
    token = req.cookies.cookietoken;
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: "Authorization token required" 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as UserPayload;

    req.user = {
      userId: decoded.userId,
      isAdmin: decoded.isAdmin || false,
    };

    next();
  } catch (err) {
    return res.status(401).json({ 
      success: false, 
      message: "Invalid or expired token" 
    });
  }
};

export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  // authenticateUser must be called first
  if (!req.user) {
    return res.status(401).json({ 
      success: false, 
      message: "Authentication required" 
    });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ 
      success: false, 
      message: "Admin privileges required" 
    });
  }

  next();
};