import { Request } from "express";

declare global {
  namespace Express {
    interface User {
      id: string;
      isAdmin: boolean;
    }
    
    interface Request {
      user: User;
    }
  }
}
