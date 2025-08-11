import { Suspense } from 'react';
import { getRegistrations, getProvinces, FilterState, PaginationParams } from './actions';
import AdminDashboard from './_components/AdminDashboard';

type AdminSearchParams = {
  page?: string;
  status?: string;
  provinces?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
};

interface AdminPageProps {
  searchParams?: Promise<AdminSearchParams>;
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = (await searchParams) ?? {};
  
  // Parse search params
  const currentPage = parseInt(params.page || '1');
  const pageSize = 20;
  const sortColumn = params.sortColumn || 'created_at';
  const sortDirection = (params.sortDirection as 'asc' | 'desc') || 'desc';

  const filters: FilterState = {
    status: params.status?.split(',').filter(Boolean) || [],
    provinces: params.provinces?.split(',').filter(Boolean) || [],
    search: params.search || '',
    dateFrom: params.dateFrom || '',
    dateTo: params.dateTo || '',
  };

  const pagination: PaginationParams = {
    page: currentPage,
    pageSize,
    sortColumn,
    sortDirection,
  };

  // Fetch data
  const [registrationsResult, provinces] = await Promise.all([
    getRegistrations(filters, pagination),
    getProvinces(),
  ]);

  const { registrations, totalCount, statusCounts } = registrationsResult;

  return (
    <Suspense fallback={
      <div className="space-y-8">
        {/* Loading skeleton for summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
        
        {/* Loading skeleton for filters */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
        
        {/* Loading skeleton for table */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 animate-pulse">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    }>
      <AdminDashboard
        initialRegistrations={registrations}
        initialTotalCount={totalCount}
        initialStatusCounts={statusCounts}
        initialProvinces={provinces}
      />
    </Suspense>
  );
}
