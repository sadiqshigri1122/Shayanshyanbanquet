import { Loader2 } from 'lucide-react';

export default function DashboardLoading({ label = 'Loading dashboard…' }: { label?: string }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center p-8">
      <div className="text-center space-y-3">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted">{label}</p>
      </div>
    </div>
  );
}
