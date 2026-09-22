const db = require('../config/database');

const webhookController = {
  // POST /api/webhook/payment
  handlePaymentWebhook: (req, res) => {
    try {
      const payload = req.body;
      console.log('📥 [ZERIF WEBHOOK RECEIVED]:', JSON.stringify(payload, null, 2));

      // 1. Ekstraksi data callback dari Zerif / Xendit / Tripay
      // Format Zerif Callback:
      // {
      //   "id": 5454,
      //   "uniq_id": "17898139406aae64b4057d4",
      //   "id_callback": "INV-20260919-XXXX",
      //   "jumlah": 50000,
      //   "status": "paid",
      //   "data_payment": { "status": true, "payment": "QRIS", "link": "...", "qr_url": "..." },
      //   "created_at": "...",
      //   "updated_at": "..."
      // }

      const idCallback = payload.id_callback || payload.order_id || payload.orderCode || (payload.data && payload.data.order_id);
      const uniqId = payload.uniq_id || payload.payment_id || '';
      const paymentStatus = (payload.status || (payload.data && payload.data.status) || '').toLowerCase();
      const paymentType = (payload.data_payment && payload.data_payment.payment) || payload.payment_type || 'QRIS';
      const paymentRef = String(payload.id || uniqId || '');

      // 2. Cari order berdasarkan id_callback (order_code) ATAU uniq_id
      let order = null;
      if (idCallback) {
        order = db.prepare('SELECT * FROM orders WHERE order_code = ?').get(idCallback);
      }
      if (!order && uniqId) {
        order = db.prepare('SELECT * FROM orders WHERE uniq_id = ?').get(uniqId);
      }

      if (!order) {
        console.warn(`⚠️ Webhook order not found for id_callback: "${idCallback}", uniq_id: "${uniqId}"`);
        return res.status(404).json({
          success: false,
          message: `Order reference not found (id_callback: ${idCallback}, uniq_id: ${uniqId})`
        });
      }

      // 3. Handle Status Pembayaran
      const isSuccess = ['paid', 'settlement', 'success', 'capture', 'completed'].includes(paymentStatus);
      const isFailed = ['deny', 'cancel', 'expire', 'failed', 'expired'].includes(paymentStatus);

      if (isSuccess) {
        if (order.status !== 'paid') {
          // Update order -> PAID
          db.prepare(`
            UPDATE orders
            SET status = 'paid', payment_ref = ?, payment_type = ?, paid_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `).run(paymentRef, paymentType, order.id);

          // Auto Unlock: Enroll user to course
          db.prepare(`
            INSERT OR IGNORE INTO enrollments (user_id, course_id, status)
            VALUES (?, ?, 'active')
          `).run(order.user_id, order.course_id);

          console.log(`🎉 [ZERIF SUCCESS] Order ${order.order_code} PAID! Course ID ${order.course_id} unlocked for User ID ${order.user_id}`);
        }

        return res.status(200).json({
          status: 200,
          success: true,
          message: 'Webhook processed successfully, course access granted'
        });
      } else if (isFailed) {
        db.prepare(`
          UPDATE orders
          SET status = 'failed'
          WHERE id = ?
        `).run(order.id);

        console.log(`❌ [ZERIF FAILED] Order ${order.order_code} status updated to failed`);
        return res.status(200).json({
          status: 200,
          success: true,
          message: 'Order updated to failed'
        });
      }

      // Status pending/lainnya
      return res.status(200).json({
        status: 200,
        success: true,
        message: 'Webhook received (pending status)'
      });

    } catch (error) {
      console.error('🔥 Error handling Zerif webhook:', error);
      return res.status(500).json({
        status: 500,
        success: false,
        message: 'Internal server error processing webhook'
      });
    }
  }
};

module.exports = webhookController;
