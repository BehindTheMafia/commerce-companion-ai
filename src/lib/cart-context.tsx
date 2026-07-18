import { createContext, useContext, useReducer, useEffect, type ReactNode } from "react";

export type CartProduct = {
  id: string;
  name: string;
  price: number;
  sale_price: number | null;
  image_url: string | null;
  slug: string;
};

export type CartItem = {
  product: CartProduct;
  quantity: number;
  notes?: string;
};

type CartState = {
  items: CartItem[];
};

type CartAction =
  | { type: "ADD_ITEM"; product: CartProduct; quantity?: number; notes?: string }
  | { type: "REMOVE_ITEM"; productId: string }
  | { type: "UPDATE_QUANTITY"; productId: string; quantity: number }
  | { type: "UPDATE_NOTES"; productId: string; notes: string }
  | { type: "CLEAR" };

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "ADD_ITEM": {
      const qty = action.quantity ?? 1;
      const existing = state.items.find((i) => i.product.id === action.product.id);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.product.id === action.product.id
              ? { ...i, quantity: i.quantity + qty, notes: action.notes ?? i.notes }
              : i,
          ),
        };
      }
      return {
        items: [
          ...state.items,
          { product: action.product, quantity: qty, notes: action.notes },
        ],
      };
    }
    case "REMOVE_ITEM":
      return { items: state.items.filter((i) => i.product.id !== action.productId) };
    case "UPDATE_QUANTITY": {
      if (action.quantity <= 0) {
        return { items: state.items.filter((i) => i.product.id !== action.productId) };
      }
      return {
        items: state.items.map((i) =>
          i.product.id === action.productId ? { ...i, quantity: action.quantity } : i,
        ),
      };
    }
    case "UPDATE_NOTES":
      return {
        items: state.items.map((i) =>
          i.product.id === action.productId ? { ...i, notes: action.notes } : i,
        ),
      };
    case "CLEAR":
      return { items: [] };
  }
}

type CartContextType = {
  items: CartItem[];
  addItem: (product: CartProduct, quantity?: number, notes?: string) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "hyperbee-cart";

function loadCart(): CartState {
  if (typeof window === "undefined") return { items: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { items: [] };
}

function saveCart(state: CartState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, { items: [] }, () => loadCart());

  useEffect(() => {
    saveCart(state);
  }, [state]);

  const addItem = (product: CartProduct, quantity?: number, notes?: string) =>
    dispatch({ type: "ADD_ITEM", product, quantity, notes });
  const removeItem = (productId: string) =>
    dispatch({ type: "REMOVE_ITEM", productId });
  const updateQuantity = (productId: string, quantity: number) =>
    dispatch({ type: "UPDATE_QUANTITY", productId, quantity });
  const updateNotes = (productId: string, notes: string) =>
    dispatch({ type: "UPDATE_NOTES", productId, notes });
  const clearCart = () => dispatch({ type: "CLEAR" });

  const itemCount = state.items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = state.items.reduce((sum, i) => {
    const price = i.product.sale_price ?? i.product.price;
    return sum + price * i.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items: state.items,
        addItem,
        removeItem,
        updateQuantity,
        updateNotes,
        clearCart,
        itemCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextType {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
