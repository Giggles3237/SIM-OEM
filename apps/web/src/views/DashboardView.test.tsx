import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DashboardView } from './DashboardView';

describe('DashboardView', () => {
  it('renders action buttons', () => {
    const queryClient = new QueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <DashboardView />
      </QueryClientProvider>
    );

    expect(screen.getByText(/New Game/i)).toBeInTheDocument();
    expect(screen.getByText(/Advance Month/i)).toBeInTheDocument();
  });
});
