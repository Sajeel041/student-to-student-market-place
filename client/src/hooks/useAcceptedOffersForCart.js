import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

/**
 * Fetches the signed-in buyer's offer per cart listing and, when status is
 * accepted, exposes the same discounted line totals used on checkout.
 */
export function useAcceptedOffersForCart(cart) {
  const [offerMap, setOfferMap] = useState({});

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!cart.length) {
        if (alive) setOfferMap({});
        return;
      }
      try {
        const entries = await Promise.all(
          cart.map(async (item) => {
            try {
              const r = await api.get(`/offers/listing/${item.listingId}/mine`);
              const o = r.data;
              if (o && o.status === 'accepted') {
                return [String(item.listingId), { amount: Number(o.amount), pct: Number(o.pct) }];
              }
              return [String(item.listingId), null];
            } catch {
              return [String(item.listingId), null];
            }
          }),
        );
        if (!alive) return;
        const next = {};
        entries.forEach(([k, v]) => {
          if (v) next[k] = v;
        });
        setOfferMap(next);
      } catch {
        if (alive) setOfferMap({});
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [cart]);

  const effectiveSubtotal = useMemo(() => {
    if (!cart.length) return 0;
    return cart.reduce((sum, item) => {
      const off = offerMap[String(item.listingId)];
      const unit = off?.amount ?? item.price;
      return sum + unit * item.qty;
    }, 0);
  }, [cart, offerMap]);

  const serviceFee = cart.length > 0 ? 50 : 0;

  const effectiveTotal = useMemo(
    () => effectiveSubtotal + serviceFee,
    [effectiveSubtotal, serviceFee],
  );

  const discountAmount = useMemo(() => {
    if (!cart.length) return 0;
    const rawItemsSum = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
    return Math.max(0, rawItemsSum - effectiveSubtotal);
  }, [cart, effectiveSubtotal]);

  return { offerMap, effectiveSubtotal, effectiveTotal, discountAmount };
}
