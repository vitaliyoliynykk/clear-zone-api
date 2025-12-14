const jwt = require("jsonwebtoken");
const { JWT_SCOPE_MODULE, JWT_SCOPE_USER } = require('./constants');

const generateTokens = (userId) => {
  const accessToken = jwt.sign({ id: userId, scope: JWT_SCOPE_USER }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  const refreshToken = jwt.sign({ id: userId, scope: JWT_SCOPE_USER }, process.env.REFRESH_SECRET, {
    expiresIn: "7d",
  });

  return { accessToken, refreshToken };
};

const generateModuleToken = (deviceId) => {
  const moduleToken = jwt.sign({ deviceId, scope: JWT_SCOPE_MODULE }, process.env.JWT_SECRET, {
    expiresIn: "365d",
  });

  return { moduleToken };
};

const generateNewAccessToken = (refreshToken) => {
  const decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET);
  return jwt.sign({ id: decoded.id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

const REFRESH_TOKEN_EXPIRATION = 7 * 24 * 60 * 60 * 1000; // 7 days

module.exports = {
  generateTokens,
  generateNewAccessToken,
  REFRESH_TOKEN_EXPIRATION,
  generateModuleToken
};
