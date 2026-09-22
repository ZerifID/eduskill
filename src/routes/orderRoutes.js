const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

router.get('/checkout', isAuthenticated, orderController.getCheckout);
router.post('/checkout', isAuthenticated, orderController.postCheckout);
router.get('/:orderCode', isAuthenticated, orderController.getOrderDetail);
router.post('/:orderCode/simulate-pay', isAuthenticated, orderController.postSimulatePayment);

module.exports = router;
