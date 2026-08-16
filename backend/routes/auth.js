const express = require('express');
const router = express.Router();
const { signup, login, logout, isLoggedIn } = require('../controllers/authController');

router.post('/signup', signup);
router.post('/login', login);
router.get('/isLoggedIn', isLoggedIn);
router.post('/logout', logout);

module.exports = router;