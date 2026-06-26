import type { DashboardStats } from '@/types'
import { productsService } from './productsService'
import { customersService } from './customersService'
import { suppliersService } from './suppliersService'
import { purchasesService } from './purchasesService'
import { salesService } from './salesService'

export const dashboardService = {
  async getStats(storeId?: string): Promise<DashboardStats> {
    const products = await productsService.getAll(storeId);
    const customers = await customersService.getAll();
    const suppliers = await suppliersService.getAll();
    const purchases = await purchasesService.getAll(storeId);
    const sales = await salesService.getAll(storeId);

    // 1. Calculate Core KPIs
    const totalProducts = products.length;
    const totalCustomers = customers.length;
    const totalSuppliers = suppliers.length;
    const totalPurchases = purchases.reduce((sum, p) => sum + Number(p.total_amount), 0);
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + Number(s.grand_total), 0);

    // 2. Generate Chart 1: Revenue Overview (Monthly Sales vs. Purchases)
    // We group by last 6 months
    const revenueOverviewMap: Record<string, { sales: number; purchases: number }> = {};
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Seed last 6 months with 0
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().substring(2)}`;
      revenueOverviewMap[label] = { sales: 0, purchases: 0 };
    }

    // Populate Sales
    sales.forEach((s) => {
      const date = new Date(s.sale_date);
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;
      if (revenueOverviewMap[label] !== undefined) {
        revenueOverviewMap[label].sales += Number(s.grand_total);
      }
    });

    // Populate Purchases
    purchases.forEach((p) => {
      const date = new Date(p.purchase_date);
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().substring(2)}`;
      if (revenueOverviewMap[label] !== undefined) {
        revenueOverviewMap[label].purchases += Number(p.total_amount);
      }
    });

    const revenueOverview = Object.entries(revenueOverviewMap).map(([date, data]) => ({
      date,
      sales: parseFloat(data.sales.toFixed(2)),
      purchases: parseFloat(data.purchases.toFixed(2))
    }));

    // 3. Generate Chart 2: Monthly Sales Chart (Last 6 Months bar chart)
    const monthlySales = revenueOverview.map((item) => ({
      name: item.date,
      amount: item.sales
    }));

    // 4. Recent Sales (Take last 5)
    const recentSales = sales.slice(0, 5);

    // 5. Low Stock Products (stock <= min_stock)
    const lowStockProducts = products
      .filter((p) => p.stock <= p.min_stock)
      .sort((a, b) => a.stock - b.stock);

    return {
      totalProducts,
      totalCustomers,
      totalSuppliers,
      totalPurchases,
      totalSales,
      totalRevenue,
      revenueOverview,
      monthlySales,
      recentSales,
      lowStockProducts
    };
  }
};
