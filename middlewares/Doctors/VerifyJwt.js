const jwt = require("jsonwebtoken");

const verifyDocJWT = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (authHeader == undefined) {
    return res.status(403).json("Auth token is not provided");
  }
  const token = authHeader.split(" ")[1];
  if (token == null) {
    return res.status(401).json("No Authorization Token");
  }
  jwt.verify(token, process.env.JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: "Token has expired." });
      } else {
        return res.status(403).json({ error: "Wrong Auth Token" });
      }
    }
    req.user = decoded;
    next();
  });
};

module.exports = { verifyDocJWT };
