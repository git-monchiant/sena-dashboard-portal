import { PageHeader } from '@shared/ui';

export function ERDiagramPage() {
  return (
    <div className="min-h-screen bg-slate-900">
      <PageHeader
        title="ER Diagram - Silverman Schema"
        subtitle="โครงสร้างฐานข้อมูล Common Fee"
      />
      <iframe
        src="/er-diagram-silverman.html"
        className="w-full border-0"
        style={{ height: 'calc(100vh - 120px)' }}
        title="ER Diagram"
      />
    </div>
  );
}
