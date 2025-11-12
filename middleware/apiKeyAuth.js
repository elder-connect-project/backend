module.exports = function apiKeyAuth(req, res, next) {
  const apiKey = req.header('x-api-key');
  const userId = req.header('x-user-id');

  if (!apiKey || apiKey !== (process.env.API_KEY || '')) {
    return res.status(401).json({ message: 'Invalid API key' });
  }
  if (!userId) {
    return res.status(400).json({ message: 'x-user-id header is required' });
  }

  req.apiUserId = userId;
  return next();
};


