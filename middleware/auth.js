const jwt = require("jsonwebtoken");

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Access token is required" });
  }

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) {
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          message: "Access token has expired",
          code: "TOKEN_EXPIRED",
        });
      }

      return res.status(403).json({
        message: "Invalid access token",
        code: "TOKEN_INVALID",
      });
    }

    req.user = user;
    next();
  });
}

module.exports = authenticateToken;
