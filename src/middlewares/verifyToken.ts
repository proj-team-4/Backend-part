import { Request , Response , NextFunction } from "express";
import jwt from 'jsonwebtoken';


export interface AuthRequest extends Request {
  user?: { id: string; username?: string }; 
}
export const tokenMiddleWare = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authtoken = req.headers.authorization;
    const SECRET_KEY = process.env.JWT_SECRET || 'secret_key_123';
    if(!authtoken) return  res.status(401).json({ error: 'Token missing' });
    const token = authtoken.split(' ')[1];

    try{
      const decoded = jwt.verify(token, SECRET_KEY) as { id: string; username?: string };
      req.user = decoded; 
        next();
    }   

    catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}