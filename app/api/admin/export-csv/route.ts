import { NextRequest } from 'next/server';
import { exportToCSV } from '../../../admin/actions';
import { getCurrentUser } from '../../../lib/auth-utils';
import { isAdmin } from '../../../lib/admin-guard';

export async function GET(request: NextRequest) {
  try {
    // Check admin access
    const user = await getCurrentUser();
    if (!user || !isAdmin(user.email)) {
      return new Response(
        JSON.stringify({ error: 'forbidden' }),
        { 
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse filters from query params
    const filters = {
      status: searchParams.get('status')?.split(',').filter(Boolean) || [],
      provinces: searchParams.get('provinces')?.split(',').filter(Boolean) || [],
      search: searchParams.get('search') || '',
      dateFrom: searchParams.get('dateFrom') || '',
      dateTo: searchParams.get('dateTo') || '',
    };

    // Generate CSV data
    const csvData = await exportToCSV(filters);
    
    // Create response with CSV headers
    const response = new Response(csvData, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="registrations-${new Date().toISOString().split('T')[0]}.csv"`,
        'Cache-Control': 'no-cache',
      },
    });

    return response;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to export CSV' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
