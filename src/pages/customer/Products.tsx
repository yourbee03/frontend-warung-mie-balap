import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import MainLayout from '../../components/layout/MainLayout';
import ProductCard from '../../components/product/ProductCard';
import { productService, categoryService } from '../../services/product.service';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import { PRODUCT_SORT_OPTIONS } from '../../lib/constants';

export default function Products() {
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearch(q);
  }, [searchParams]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categoryService.getAll(),
  });

  const { data: productsData, isLoading } = useQuery({
    queryKey: ['products', { page, search, category, sort }],
    queryFn: () => productService.getAll({ page, search, category, sort }),
  });

  const categoryOptions = [
    { value: '', label: 'Semua Kategori' },
    ...(categories?.data?.map((cat) => ({
      value: cat.slug,
      label: cat.name,
    })) || []),
  ];

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">Daftar Menu</h1>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Cari menu..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              options={categoryOptions}
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
              className="w-full md:w-48"
            />
            <Select
              options={PRODUCT_SORT_OPTIONS}
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full md:w-48"
            />
          </div>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <LoadingSpinner className="py-12" />
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
              {productsData?.data?.items?.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {productsData?.data?.items?.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">Tidak ada menu ditemukan</p>
              </div>
            )}

            {/* Pagination */}
            {productsData?.data?.pagination && productsData.data.pagination.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {Array.from({ length: productsData.data.pagination.totalPages }, (_, i) => i + 1).map(
                  (pageNum) => (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-4 py-2 rounded-md ${
                        page === pageNum
                          ? 'bg-primary text-white'
                          : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                )}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
