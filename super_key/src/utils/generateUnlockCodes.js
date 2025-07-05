const crypto = require("crypto");
const generateUnlockCodes = (quantity) => {
  const codes = new Set();
  while (codes.size < quantity) {
    const code = crypto.randomInt(100000, 1000000).toString();
    codes.add(code);
  }
  return Array.from(codes);
};

module.exports = generateUnlockCodes;