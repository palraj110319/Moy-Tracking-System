import type { DashboardData } from '../types/domain';
import { getDashboard as buildDashboard } from '../local-backend/reports';

export async function getDashboard(year: number, allYears = false): Promise<DashboardData> {
  return buildDashboard(year, allYears);
}
