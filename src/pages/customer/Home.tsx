import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Star } from 'lucide-react';
import MainLayout from '../../components/layout/MainLayout';
import ProductCard from '../../components/product/ProductCard';
import { Input } from '../../components/ui/Input';
import { productService, categoryService } from '../../services/product.service';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { useStockUpdates } from '../../services/socket.service';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  const handleStockChanged = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['home-products'] });
  }, [queryClient]);

  useStockUpdates(handleStockChanged);

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['home-products', selectedCategory, search],
    queryFn: () =>
      productService.getAll({
        page: 1,
        limit: 50,
        category: selectedCategory || undefined,
        search: search || undefined,
      }),
  });

  // Top products (most frequently ordered)
  const { data: topProducts, isLoading: topLoading } = useQuery({
    queryKey: ['top-products-home'],
    queryFn: async () => {
      const res = await api.get('/dashboard/top-products', { params: { limit: 6 } });
      return res.data.data as { id: number; name: string; price: string; total_sold: string }[];
    },
  });

  const categories = categoriesData?.data || [];
  const products = productsData?.data?.items || [];

  return (
    <MainLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-red-600 to-red-700 text-white">
        <div className="container mx-auto px-4 py-16 md:py-20">
          <div className="max-w-2xl text-center md:text-left">
            <h1 className="text-3xl md:text-5xl font-bold mb-4">
              Warung Mie Balap
            </h1>
            <p className="text-lg md:text-xl mb-6 text-red-100">
              Mie pedas dengan rasa otentik dan kepedasan yang nikmat.
            </p>

            {/* Search */}
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari menu favoritmu..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/95 text-gray-900"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Top Products - Most Ordered */}
      <section className="py-10 bg-yellow-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
            <Star className="h-6 w-6 text-yellow-500 fill-yellow-500" />
            <h2 className="text-2xl font-bold">Paling Sering Dipesan</h2>
          </div>

          {topLoading ? (
            <LoadingSpinner className="py-8" />
          ) : topProducts && topProducts.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {topProducts.map((item) => (
                <div key={item.id} className="bg-white rounded-lg shadow-sm p-4 text-center">
                  <p className="font-semibold text-sm mb-1 line-clamp-2">{item.name}</p>
                  <p className="text-primary font-bold">{Number(item.price).toLocaleString('id-ID')}</p>
                  <p className="text-xs text-gray-500 mt-1">{Number(item.total_sold)} terjual</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">Belum ada data pesanan</p>
          )}
        </div>
      </section>

      {/* Category Buttons */}
      <section className="py-4 border-b bg-white sticky top-16 z-30">
        <div className="container mx-auto px-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-2">
            <button
              onClick={() => setSelectedCategory('')}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === ''
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Semua Menu
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.slug)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat.slug
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* All Products */}
      <section className="py-10">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-6">
            {selectedCategory
              ? categories.find((c) => c.slug === selectedCategory)?.name || 'Menu'
              : search
              ? `Hasil pencarian "${search}"`
              : 'Semua Menu'}
          </h2>

          {isLoading ? (
            <LoadingSpinner className="py-12" />
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">Menu tidak ditemukan</p>
            </div>
          ) : (
            <>
              {/* Group by category if showing all */}
              {!selectedCategory && !search ? (
                categories.map((cat) => {
                  const catProducts = products.filter((p) => p.category_name === cat.name);
                  if (catProducts.length === 0) return null;
                  return (
                    <div key={cat.id} className="mb-10">
                      <h3 className="text-xl font-bold mb-4 text-gray-800">{cat.name}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                        {catProducts.map((product) => (
                          <ProductCard key={product.id} product={product} />
                        ))}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </MainLayout>
  );
}
