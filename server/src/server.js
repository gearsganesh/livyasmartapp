import 'dotenv/config';
import app from './app.js';
import prisma from './lib/prisma.js';
const port=Number(process.env.PORT||4000);
const server=app.listen(port,()=>console.log(`LIVYA API listening on ${port}`));
async function shutdown(){server.close(async()=>{await prisma.$disconnect();process.exit(0);});setTimeout(()=>process.exit(1),10000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
