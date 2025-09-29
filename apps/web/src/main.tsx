import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Outlet, RouterProvider, createRouter, createRootRoute, createRoute } from '@tanstack/react-router';
import { DashboardView } from './views/DashboardView';
import { PlanningView } from './views/PlanningView';
import './index.css';

const queryClient = new QueryClient();
const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">SimOEM</h1>
            <p className="text-sm text-slate-600">Maxis-style automotive OEM simulation</p>
          </div>
          <nav className="flex gap-4 text-sm">
            <Link to="/" className="text-slate-600 hover:text-slate-900">
              Dashboard
            </Link>
            <Link to="/planning" className="text-slate-600 hover:text-slate-900">
              Planning
            </Link>
          </nav>
        </header>
        <Outlet />
      </div>
    </div>
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardView,
});

const planningRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/planning',
  component: PlanningView,
});

const routeTree = rootRoute.addChildren([dashboardRoute, planningRoute]);
const router = createRouter({ routeTree });

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
