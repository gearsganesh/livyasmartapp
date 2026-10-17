import 'dotenv/config';
import bcrypt from 'bcrypt';
import prisma from '../src/lib/prisma.js';
const email=process.env.BOOTSTRAP_ADMIN_EMAIL;
const password=process.env.BOOTSTRAP_ADMIN_PASSWORD;
const fullName=process.env.BOOTSTRAP_ADMIN_NAME||'LIVYA Administrator';
if(!email||!password||password.length<16){console.error('Set BOOTSTRAP_ADMIN_EMAIL and a unique BOOTSTRAP_ADMIN_PASSWORD of at least 16 characters.');process.exit(1);}
try{const existing=await prisma.user.findUnique({where:{email:email.toLowerCase()}});if(existing){console.log('Bootstrap account already exists; no changes made.');}else{await prisma.user.create({data:{email:email.toLowerCase(),fullName,passwordHash:await bcrypt.hash(password,12),role:'SUPERADMIN'}});console.log('Initial superadmin created. Remove bootstrap secrets from the environment now.');}}finally{await prisma.$disconnect();}
