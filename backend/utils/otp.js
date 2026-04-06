const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Generates a random 6-digit numeric OTP.
 * @returns {string} 6-digit OTP string.
 */
exports.generateOTP = () => {
    return crypto.randomInt(100000, 999999).toString();
};

/**
 * Hashes an OTP for secure storage in the database.
 * @param {string} otp - The plain text OTP.
 * @returns {Promise<string>} Hashed OTP.
 */
exports.hashOTP = async (otp) => {
    return await bcrypt.hash(otp, 10);
};

/**
 * Verifies a provided OTP against its hashed version.
 * @param {string} otp - The plain text OTP to verify.
 * @param {string} hashedOtp - The hashed OTP from the database.
 * @returns {Promise<boolean>} True if match, false otherwise.
 */
exports.verifyOTP = async (otp, hashedOtp) => {
    return await bcrypt.compare(otp, hashedOtp);
};
