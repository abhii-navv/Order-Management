const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const authorizeRoles = require('../middleware/roleCheck');
const {
  register, registerValidation, createAdmin,
  login, loginValidation,
  logout,
  changePassword, changePasswordValidation,
  getMe
} = require('../controllers/authController');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many auth requests from this IP, please try again after 15 minutes' }
});

router.post('/register',         authLimiter, registerValidation,       register);
router.post('/login',            authLimiter, loginValidation,          login);
router.post('/create-admin',     authenticate, authorizeRoles('admin'), registerValidation, createAdmin);
router.post('/logout',           authenticate,             logout);
router.post('/change-password',  authenticate, changePasswordValidation, changePassword);
router.get('/me',                authenticate,             getMe);

module.exports = router;
