// Middleware: centralized error handler
function errorHandler(err, req, res, next) {
  console.error(err.stack);
  const isProd = process.env.NODE_ENV === "production";
  res.status(err.status || 500).json({
    error: isProd ? "Internal Server Error" : err.message || "Internal Server Error",
  });
}

module.exports = errorHandler;
