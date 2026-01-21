interface FunnelPeriod {
  label: string;
  lead: number;
  ql: number;
  walk: number;
  book: number;
}

interface LeadFunnelCardsProps {
  totals: {
    lead: number;
    ql: number;
    walk: number;
    book: number;
  };
  quarters: Array<{
    quarter: string;
    totalLead: number;
    qualityLead: number;
    walk: number;
    book: number;
  }>;
  embedded?: boolean;
}

export function LeadFunnelCards({ totals, quarters, embedded = false }: LeadFunnelCardsProps) {
  // Always show all 4 quarters (Q1-Q4) even if no data
  const ALL_QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

  const periods: FunnelPeriod[] = [
    { label: 'YTD', lead: totals.lead, ql: totals.ql, walk: totals.walk, book: totals.book },
    ...ALL_QUARTERS.map(qLabel => {
      const q = quarters.find(item => item.quarter === qLabel);
      return {
        label: qLabel,
        lead: q?.totalLead ?? 0,
        ql: q?.qualityLead ?? 0,
        walk: q?.walk ?? 0,
        book: q?.book ?? 0,
      };
    }),
  ];

  return (
    <div className={embedded ? 'mt-6 pt-6 border-t border-slate-100' : 'mb-8'}>
      <div className="mb-4">
        <h3 className="font-semibold text-slate-800">Lead Conversion Funnel</h3>
        <p className="text-sm text-slate-500">Total Lead → Quality Lead → Walk → Book</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {periods.map((period, idx) => {
          const maxVal = period.lead || 1;
          const qlPct = period.lead > 0 ? ((period.ql / period.lead) * 100).toFixed(1) : '0';
          const walkPct = period.ql > 0 ? ((period.walk / period.ql) * 100).toFixed(1) : '0';
          const bookPct = period.walk > 0 ? ((period.book / period.walk) * 100).toFixed(1) : '0';

          // Get previous quarter for comparison (skip for Total and Q1)
          const prevPeriod = idx > 1 ? periods[idx - 1] : null;
          const leadDiffPct = prevPeriod && prevPeriod.lead > 0 ? ((period.lead - prevPeriod.lead) / prevPeriod.lead) * 100 : null;
          const qlDiffPct = prevPeriod && prevPeriod.ql > 0 ? ((period.ql - prevPeriod.ql) / prevPeriod.ql) * 100 : null;
          const walkDiffPct = prevPeriod && prevPeriod.walk > 0 ? ((period.walk - prevPeriod.walk) / prevPeriod.walk) * 100 : null;
          const bookDiffPct = prevPeriod && prevPeriod.book > 0 ? ((period.book - prevPeriod.book) / prevPeriod.book) * 100 : null;

          const isYTD = idx === 0;

          return (
            <div
              key={idx}
              className={`rounded-xl border overflow-hidden ${isYTD ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100'}`}
            >
              {/* Header */}
              <div className={`px-4 py-2 ${isYTD ? 'bg-blue-100' : 'bg-slate-50'}`}>
                <div className={`font-semibold text-sm ${isYTD ? 'text-blue-700' : 'text-slate-600'}`}>
                  {period.label}
                </div>
              </div>

              {/* Body */}
              <div className="p-4">
                <div className="space-y-2">
                  {[
                    { name: 'Lead', value: period.lead, color: 'bg-slate-400', diff: leadDiffPct, ratio: null },
                    { name: 'QL', value: period.ql, color: 'bg-violet-500', diff: qlDiffPct, ratio: period.ql > 0 ? period.lead / period.ql : null },
                    { name: 'Walk', value: period.walk, color: 'bg-emerald-500', diff: walkDiffPct, ratio: period.walk > 0 ? period.ql / period.walk : null },
                    { name: 'Book', value: period.book, color: 'bg-blue-500', diff: bookDiffPct, ratio: period.book > 0 ? period.walk / period.book : null },
                  ].map((item, i) => {
                    const barWidth = maxVal > 0 ? (item.value / maxVal) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-10 text-xs text-slate-500 text-right">{item.name}</div>
                        <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                          <div
                            className={`h-full ${item.color} rounded`}
                            style={{ width: `${Math.max(barWidth, 3)}%` }}
                          />
                        </div>
                        <div className="w-24 text-right flex items-center justify-end gap-1">
                          <span className="text-xs font-semibold text-slate-700 tabular-nums">
                            {item.value.toLocaleString()}
                          </span>
                          {item.diff !== null && (
                            <span className={`text-[10px] tabular-nums ${item.diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {item.diff >= 0 ? '+' : ''}{item.diff.toFixed(0)}%
                            </span>
                          )}
                          {item.ratio !== null && (
                            <span className="text-[9px] text-slate-400 tabular-nums">
                              ({item.ratio.toFixed(1)} : 1)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              <div className="mt-3 pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between gap-2">
                <span>L→QL: <span className="text-violet-600 font-medium">{qlPct}%</span></span>
                <span>QL→W: <span className="text-emerald-600 font-medium">{walkPct}%</span></span>
                <span>W→B: <span className="text-blue-600 font-medium">{bookPct}%</span></span>
              </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
