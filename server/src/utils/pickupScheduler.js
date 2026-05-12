const Order = require('../models/Order');
const Listing = require('../models/Listing');
const User = require('../models/User');
const Notification = require('../models/Notification');

// Two-stage workflow once an order's pickup time has passed:
//   1. Send reminders to BOTH parties asking them to confirm pickup.
//   2. After AUTO_CLOSE_AFTER_MS without any confirmation, mark the order
//      as 'auto_closed' and ensure the listing is marked sold (it usually
//      already is). The seller's sold count still gets bumped.
//
// The scheduler is intentionally simple: it runs every TICK_MS and walks the
// "live" orders. Numbers are small (HCI demo), so a full collection scan is
// fine and avoids needing a worker queue.

const TICK_MS = 60 * 1000; // 1 minute
const AUTO_CLOSE_AFTER_MS = 2 * 60 * 60 * 1000; // 2 hours

let timerHandle = null;

const sendReminders = async (order) => {
  const targets = [order.buyer, order.seller].filter(Boolean);
  await Promise.all(targets.map((userId) =>
    Notification.create({
      user: userId,
      type: 'pickup',
      title: 'Pickup reminder',
      body: 'Your scheduled pickup time has passed. Tap to confirm whether the exchange happened.',
      url: `/order/${order._id}`,
      meta: {
        orderId: String(order._id),
        kind: 'pickup_reminder',
      },
    })
  ));
};

const autoCloseOrder = async (order) => {
  order.status = 'auto_closed';
  order.pickupConfirmation.autoClosedAt = new Date();
  await order.save();

  // Make sure the listing reflects the auto-close. We don't re-activate
  // it — the seller's window has passed and we mark it as sold for their
  // dashboard. Bump soldCount once.
  await Promise.all((order.items || []).map((it) => {
    if (!it.listing) return null;
    return Listing.findByIdAndUpdate(it.listing, { status: 'sold' });
  }));

  const sellerIds = Array.from(new Set(
    (order.items || []).map(i => String(i.seller || ''))
      .filter(Boolean)
  ));
  await Promise.all(sellerIds.map(sid =>
    User.findByIdAndUpdate(sid, { $inc: { soldCount: 1 } })
  ));

  // Tell both parties.
  const targets = [order.buyer, order.seller].filter(Boolean);
  await Promise.all(targets.map((userId) =>
    Notification.create({
      user: userId,
      type: 'system',
      title: 'Order auto-closed',
      body: 'Neither side confirmed pickup in time, so we closed the order automatically. The listing is no longer live.',
      url: `/order/${order._id}`,
      meta: { orderId: String(order._id), kind: 'auto_closed' },
    })
  ));
};

const runTick = async () => {
  try {
    const now = Date.now();
    const candidates = await Order.find({
      status: { $in: ['placed', 'confirmed'] },
      pickupAt: { $ne: null, $lte: new Date(now) },
    });

    for (const order of candidates) {
      const reminded = order.pickupConfirmation?.reminderSentAt;
      const buyerOk = !!order.pickupConfirmation?.buyerConfirmedAt;
      const sellerOk = !!order.pickupConfirmation?.sellerConfirmedAt;
      if (buyerOk || sellerOk) continue; // someone already responded

      if (!reminded) {
        await sendReminders(order);
        order.pickupConfirmation.reminderSentAt = new Date();
        await order.save();
        continue;
      }

      if (now - new Date(reminded).getTime() >= AUTO_CLOSE_AFTER_MS) {
        await autoCloseOrder(order);
      }
    }
  } catch (err) {
    console.error('pickup scheduler tick failed:', err);
  }
};

const startPickupScheduler = () => {
  if (timerHandle) return;
  // Kick off shortly after boot so dev restarts pick up pending work fast.
  setTimeout(runTick, 5_000);
  timerHandle = setInterval(runTick, TICK_MS);
  console.log(`[pickup-scheduler] running every ${TICK_MS / 1000}s, auto-close after ${AUTO_CLOSE_AFTER_MS / 60_000}min`);
};

module.exports = { startPickupScheduler, runTick, TICK_MS, AUTO_CLOSE_AFTER_MS };
