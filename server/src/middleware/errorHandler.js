export function errorHandler(error,req,res,next) {
  if (res.headersSent) return next(error);
  const status = Number.isInteger(error.status) ? error.status : error.code === 'P2002' ? 409 : error.code === 'P2003' ? 400 : error.code === 'P2025' ? 404 : 500;
  console.error(JSON.stringify({level:'error',method:req.method,path:req.path,status,error:error.name || 'Error',code:error.code || undefined}));
  const message = status === 409 ? 'A record with one of these unique values already exists.' : status === 400 && error.code === 'P2003' ? 'A referenced record is missing or cannot be removed.' : status === 404 ? 'Record not found.' : status >= 500 ? 'An unexpected server error occurred.' : error.message;
  return res.status(status).json({error:message});
}
