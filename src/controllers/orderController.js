const db = require('../config/database');

const orderController = {
  // Checkout Page
  getCheckout: (req, res) => {
    if (!req.session || !req.session.user) {
      req.session.returnTo = req.originalUrl;
      return res.redirect('/auth/login');
    }

    const { courseId } = req.query;
    if (!courseId) {
      req.session.flashError = 'Kelas tidak ditemukan!';
      return res.redirect('/');
    }

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
    if (!course) {
      req.session.flashError = 'Kelas tidak valid!';
      return res.redirect('/');
    }

    // Check if already enrolled
    const isEnrolled = db.prepare("SELECT id FROM enrollments WHERE user_id = ? AND course_id = ? AND status = 'active'").get(req.session.user.id, course.id);
    if (isEnrolled) {
      req.session.flashSuccess = 'Kamu sudah memiliki akses ke kelas ini!';
      return res.redirect(`/course/${course.slug}/learn`);
    }

    res.render('student/checkout', {
      title: `Checkout - ${course.title}`,
      course
    });
  },

  // Process Checkout (Create Order & Call Zerif Payment API)
  postCheckout: async (req, res) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/auth/login');
    }

    const { course_id } = req.body;
    const userId = req.session.user.id;

    const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(course_id);
    if (!course) {
      req.session.flashError = 'Kelas tidak ditemukan!';
      return res.redirect('/');
    }

    // If free course (price = 0), auto enroll directly
    if (course.price === 0) {
      db.prepare(`
        INSERT OR IGNORE INTO enrollments (user_id, course_id, status)
        VALUES (?, ?, 'active')
      `).run(userId, course.id);

      req.session.flashSuccess = 'Berhasil bergabung dengan kelas gratis ini!';
      return res.redirect(`/course/${course.slug}/learn`);
    }

    // Generate unique order ID/code
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randNum = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `INV-${dateStr}-${randNum}`;

    // Insert pending order locally first
    const insert = db.prepare(`
      INSERT INTO orders (order_code, user_id, course_id, amount, status)
      VALUES (?, ?, ?, ?, 'pending')
    `).run(orderCode, userId, course.id, course.price);

    const orderId = insert.lastInsertRowid;
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 9993}`;

    // Zerif Payment API Configuration
    const callbackUrl = `${baseUrl}/api/webhook/payment`;
    const returnUrl = `${baseUrl}/orders/${orderCode}`;
    const amount = course.price;
    const idCallback = orderCode; // Use orderCode as reference in callback

    const apiUrl = `https://product.zerif.id/api/payment/create?jumlah=${amount}&callback_url=${encodeURIComponent(callbackUrl)}&id_callback=${encodeURIComponent(idCallback)}&return_url=${encodeURIComponent(returnUrl)}`;

    try {
      console.log(`📡 Requesting Zerif Payment API: ${apiUrl}`);
      const apiResponse = await fetch(apiUrl, { method: 'GET' });
      const apiData = await apiResponse.json();

      console.log('📦 Zerif API Response:', JSON.stringify(apiData, null, 2));

      if (apiData && (apiData.status === 201 || apiData.uniq_id || apiData.xendit)) {
        const uniqId = apiData.uniq_id || '';
        const paymentRef = String(apiData.payment_id || '');
        const paymentType = apiData.xendit ? apiData.xendit.payment : 'QRIS';
        const paymentUrl = apiData.xendit ? apiData.xendit.link : '';
        const qrUrl = apiData.xendit ? apiData.xendit.qr_url : '';

        // Update order with payment gateway response data
        db.prepare(`
          UPDATE orders
          SET uniq_id = ?, payment_ref = ?, payment_type = ?, payment_url = ?, qr_url = ?
          WHERE id = ?
        `).run(uniqId, paymentRef, paymentType, paymentUrl, qrUrl, orderId);

        return res.redirect(`/orders/${orderCode}`);
      } else {
        console.error('⚠️ Zerif Payment API returned unexpected response:', apiData);
        // Fallback to order detail page so user can still see invoice
        return res.redirect(`/orders/${orderCode}`);
      }
    } catch (err) {
      console.error('🔥 Error calling Zerif Payment API:', err);
      return res.redirect(`/orders/${orderCode}`);
    }
  },

  // Order Payment Page (Shows QRIS & Payment Link)
  getOrderDetail: (req, res) => {
    const { orderCode } = req.params;
    const order = db.prepare(`
      SELECT o.*, c.title as course_title, c.slug as course_slug, c.thumbnail_url
      FROM orders o
      JOIN courses c ON o.course_id = c.id
      WHERE o.order_code = ?
    `).get(orderCode);

    if (!order) {
      return res.status(404).render('partials/404', { title: 'Order Tidak Ditemukan' });
    }

    res.render('student/order-payment', {
      title: `Pembayaran ${order.order_code}`,
      order
    });
  },

  // Manual / Simulative Payment Confirm (Untuk testing admin/user jika tanpa webhook)
  postSimulatePayment: (req, res) => {
    const { orderCode } = req.params;
    const order = db.prepare('SELECT * FROM orders WHERE order_code = ?').get(orderCode);

    if (!order) {
      req.session.flashError = 'Order tidak ditemukan!';
      return res.redirect('/');
    }

    if (order.status === 'paid') {
      req.session.flashSuccess = 'Order ini sudah dibayar!';
      return res.redirect(`/orders/${orderCode}`);
    }

    // Update order status to paid
    db.prepare(`
      UPDATE orders
      SET status = 'paid', paid_at = CURRENT_TIMESTAMP, payment_type = 'simulation'
      WHERE id = ?
    `).run(order.id);

    // Auto Enroll user into course
    db.prepare(`
      INSERT OR IGNORE INTO enrollments (user_id, course_id, status)
      VALUES (?, ?, 'active')
    `).run(order.user_id, order.course_id);

    req.session.flashSuccess = 'Pembayaran berhasil! Kelas sudah otomatis terbuka.';
    return res.redirect(`/orders/${orderCode}`);
  }
};

module.exports = orderController;
