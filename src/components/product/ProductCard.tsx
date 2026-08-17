import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingCart, Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '../ui/Dialog';
import { Product, ProductOption } from '../../types';
import { formatCurrency } from '../../lib/utils';
import { useCart } from '../../contexts/CartContext';

interface ProductCardProps {
  product: Product;
}

function parseCustomOptions(product: Product): ProductOption[] {
  if (!product.custom_options) return [];
  try {
    const raw = typeof product.custom_options === 'string'
      ? JSON.parse(product.custom_options)
      : product.custom_options;
    return raw.map((opt: any) => ({
      name: opt.name,
      key: opt.key,
      options: (opt.options || []).map((v: any) =>
        typeof v === 'string' ? { label: v, price: 0 } : v
      ),
    }));
  } catch { return []; }
}

function buildNotes(parsedOptions: ProductOption[], selections: Record<string, string>, note: string): string {
  const parts: string[] = [];
  for (const opt of parsedOptions) {
    const selected = selections[opt.key];
    if (selected) parts.push(selected);
  }
  if (note.trim()) parts.push(note.trim());
  return parts.join(', ');
}

function calcOptionsPrice(parsedOptions: ProductOption[], selections: Record<string, string>): number {
  let total = 0;
  for (const opt of parsedOptions) {
    const selected = selections[opt.key];
    if (selected) {
      const val = opt.options.find((v) => v.label === selected);
      if (val && val.price) total += val.price;
    }
  }
  return total;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { addItem } = useCart();
  const [showAdded, setShowAdded] = useState(false);
  const [showOptionPicker, setShowOptionPicker] = useState(false);
  const [optionSelections, setOptionSelections] = useState<Record<string, string>>({});
  const [customNote, setCustomNote] = useState('');
  const isOutOfStock = product.stock <= 0;
  const parsedOptions = parseCustomOptions(product);
  const hasOptions = parsedOptions.length > 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    if (hasOptions) {
      setOptionSelections({});
      setCustomNote('');
      setShowOptionPicker(true);
      return;
    }

    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.image || `https://placehold.co/400x400/f3f4f6/9ca3af?text=${encodeURIComponent(product.name)}`,
    });
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 2000);
  };

  const confirmAddToCart = () => {
    const notes = buildNotes(parsedOptions, optionSelections, customNote);
    const optionsPrice = calcOptionsPrice(parsedOptions, optionSelections);

    addItem({
      product_id: product.id,
      name: product.name,
      price: product.price,
      image: product.images?.[0]?.image || `https://placehold.co/400x400/f3f4f6/9ca3af?text=${encodeURIComponent(product.name)}`,
      notes: notes || undefined,
      options_price: optionsPrice > 0 ? optionsPrice : undefined,
      selected_options: Object.keys(optionSelections).length > 0 ? optionSelections : undefined,
    });
    setShowOptionPicker(false);
    setShowAdded(true);
    setTimeout(() => setShowAdded(false), 2000);
  };

  return (
    <>
      <Link to={`/products/${product.slug}`} className="group relative">
        <div className={`bg-white rounded-lg shadow-md overflow-hidden transition-shadow hover:shadow-lg ${isOutOfStock ? 'opacity-70' : ''}`}>
          <div className="aspect-square bg-gray-100 relative">
            <img
              src={product.images?.[0]?.image || `https://placehold.co/400x400/f3f4f6/9ca3af?text=${encodeURIComponent(product.name)}`}
              alt={product.name}
              className={`w-full h-full object-cover transition-transform duration-300 ${isOutOfStock ? 'grayscale' : 'group-hover:scale-105'}`}
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://placehold.co/400x400/f3f4f6/9ca3af?text=${encodeURIComponent(product.name)}`;
              }}
            />
            {isOutOfStock && (
              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full z-10">
                Stok Habis
              </div>
            )}
            {hasOptions && (
              <div className="absolute top-2 left-2 bg-primary/80 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10">
                Opsi
              </div>
            )}
            {showAdded && (
              <div className="absolute inset-0 bg-green-500/90 flex items-center justify-center z-10 transition-opacity">
                <div className="text-center text-white">
                  <Check className="h-12 w-12 mx-auto mb-2" />
                  <p className="font-bold text-lg">Ditambahkan!</p>
                  <Link
                    to="/checkout"
                    onClick={(e) => e.stopPropagation()}
                    className="mt-2 inline-block bg-white text-green-600 px-4 py-2 rounded-full font-semibold text-sm hover:bg-gray-100"
                  >
                    Checkout Sekarang
                  </Link>
                </div>
              </div>
            )}
          </div>
          <div className="p-4">
            <p className="text-xs text-gray-500 mb-1">{product.category_name}</p>
            <h3 className="font-semibold text-gray-800 mb-2 line-clamp-2">{product.name}</h3>
            <p className="text-lg font-bold text-primary mb-3">{formatCurrency(product.price)}</p>
            {isOutOfStock ? (
              <Button disabled className="w-full" size="sm" variant="outline">
                Stok Habis
              </Button>
            ) : (
              <Button onClick={handleAddToCart} className="w-full" size="sm">
                <ShoppingCart className="h-4 w-4 mr-2" />
                Tambah
              </Button>
            )}
          </div>
        </div>
      </Link>

      {/* Option Picker Dialog */}
      <Dialog open={showOptionPicker} onOpenChange={(open) => { if (!open) setShowOptionPicker(false); }}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto">
          <DialogClose onClick={() => setShowOptionPicker(false)} />
          <DialogHeader>
            <DialogTitle>{product.name}</DialogTitle>
          </DialogHeader>
          {parsedOptions.map((opt) => (
            <div key={opt.key} className="mt-3">
              <p className="text-sm font-medium mb-2">{opt.name}</p>
              <div className="flex flex-wrap gap-2">
                {opt.options.map((v) => (
                  <button
                    key={v.label}
                    onClick={() => setOptionSelections((prev) => ({
                      ...prev,
                      [opt.key]: prev[opt.key] === v.label ? '' : v.label,
                    }))}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                      optionSelections[opt.key] === v.label
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-primary'
                    }`}
                  >
                    {v.label}
                    {v.price > 0 && <span className="ml-1 text-xs opacity-80">+{formatCurrency(v.price)}</span>}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <div className="mt-3">
            <p className="text-sm font-medium mb-1">Catatan Tambahan</p>
            <Input
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              placeholder="Contoh: Extra pedas, kurangi minyak..."
            />
          </div>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setShowOptionPicker(false)}>
              Batal
            </Button>
            <Button className="flex-1" onClick={confirmAddToCart}>
              Tambah
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
