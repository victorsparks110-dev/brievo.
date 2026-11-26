import { seedDatabase } from '@/services/mockStorage'

/**
 * Application bootstrap.
 *
 * Seeds the mock database into localStorage before the React tree renders.
 * In demo mode this is required so services have data to read. A future
 * backend replaces this with API configuration / auth token restore.
 */
export function bootApplication() {
  seedDatabase()
}
