/**
 * Wraps an async route handler so rejected promises
 * are automatically forwarded to Express's global error handler.
 * 
 * BEFORE: router.get('/', async (req, res) => { try { ... } catch(e) { res.status(500)... } })
 * AFTER:  router.get('/', catchAsync(bookingController.getAll))
 * 
 * No more try/catch in every single handler.
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
