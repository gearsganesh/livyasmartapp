import jwt from 'jsonwebtoken';
import { createHash } from 'node:crypto';
import prisma from '../lib/prisma.js';
const cookieName = () => process.env.COOKIE_NAME || 'livya_session';
export async function protectRoute(req,res,next) {
  try {
    const token = req.cookies?.[cookieName()];
    if (!token) return res.status(401).json({error:'Authentication required.'});
    let claims;
    try { claims = jwt.verify(token,process.env.JWT_SECRET,{algorithms:['HS256'],issuer:'livyacurehub-api',audience:'livyacurehub-client'}); }
    catch { return res.status(401).json({error:'Session is invalid or expired.'}); }
    if (typeof claims.sub !== 'string' || typeof claims.sid !== 'string') return res.status(401).json({error:'Invalid session.'});
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await prisma.session.findFirst({where:{id:claims.sid,userId:claims.sub,tokenHash,revokedAt:null,expiresAt:{gt:new Date()},user:{is:{isActive:true}}},include:{user:{select:{id:true,email:true,fullName:true,role:true,isActive:true}}}});
    if (!session) return res.status(401).json({error:'Session is no longer valid.'});
    req.user = session.user; req.sessionId = session.id; next();
  } catch (error) { next(error); }
}
export function requireRoles(...roles) { return (req,res,next) => !req.user ? res.status(401).json({error:'Authentication required.'}) : roles.includes(req.user.role) ? next() : res.status(403).json({error:'Insufficient permissions.'}); }
