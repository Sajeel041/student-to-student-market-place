import { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(null);
const STORAGE_KEY = 'uniswap_cart';

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }, [cart]);

  const addToCart = (listing) => {
    setCart(prev => {
      if (prev.find(i => i.listingId === listing._id)) return prev;
      return [...prev, {
        listingId: listing._id,
        title: listing.title,
        price: listing.price,
        photoUrl: listing.photos?.[0] || null,
        pickup: listing.pickup,
        sellerName: listing.seller?.name || 'Seller',
        qty: 1,
      }];
    });
  };

  const removeFromCart = (listingId) =>
    setCart(prev => prev.filter(i => i.listingId !== listingId));

  const updateQty = (listingId, qty) =>
    setCart(prev => prev.map(i => i.listingId === listingId ? { ...i, qty } : i));

  const clearCart = () => setCart([]);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const cartTotal = cartSubtotal + (cart.length > 0 ? 50 : 0);

  const inCart = (listingId) => cart.some(i => i.listingId === listingId);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, updateQty, clearCart, cartCount, cartSubtotal, cartTotal, inCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
};
