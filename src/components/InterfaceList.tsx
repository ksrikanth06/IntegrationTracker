import { Link } from 'react-router-dom';
import type { Interface } from '../types';
import { getCategoryBg, getCategory } from '../lib/utils';

interface Props {
  items: Interface[];
}

export default function InterfaceList({ items }: Props) {
  if (items.length === 0) {
    return (
      <div className="card p-12 text-center">
        <p className="font-display text-lg font-semibold text-navy-900 mb-1">
          No projects match these filters
        </p>
        <p className="text-sm text-navy-500">
          Try clearing the search or selecting a different category.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-navy-100">
          <thead className="bg-navy-50">
            <tr>
              <Th>ID</Th>
              <Th>Interface</Th>
              <Th>Category</Th>
              <Th>Source → Target</Th>
              <Th>Frequency</Th>
              <Th>Priority</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-100 bg-white">
            {items.map(item => {
              const cat = getCategory(item);
              return (
                <tr
                  key={item.InterfaceID}
                  className="hover:bg-navy-50 transition-colors"
                >
                  <td className="px-4 py-3 font-mono text-xs text-navy-600 whitespace-nowrap">
                    <Link
                      to={`/projects/${encodeURIComponent(item.InterfaceID)}`}
                      className="hover:text-rail hover:underline"
                    >
                      {item.InterfaceID}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      to={`/projects/${encodeURIComponent(item.InterfaceID)}`}
                      className="block group"
                    >
                      <div className="font-medium text-navy-900 group-hover:text-rail">
                        {item.InterfaceName}
                      </div>
                      <div className="text-xs text-navy-500 truncate max-w-md">
                        {item.DataObject}
                      </div>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`chip ${getCategoryBg(cat)}`}>{cat}</span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1.5 text-navy-700 whitespace-nowrap">
                      <span className="font-medium">{item.SourceApplication}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-navy-400 flex-shrink-0">
                        <path d="M5 12h14M13 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span className="font-medium">{item.TargetApplication}</span>
                    </div>
                    <div className="text-xs text-navy-500 mt-0.5">
                      {item.SourceProtocol} · {item.TargetProtocol}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-navy-700 whitespace-nowrap">
                    {item.InterfaceFrequency}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="chip bg-navy-100 text-navy-800 font-semibold">
                      {item.InterfacePriority}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {item.IsActive === 1 ? (
                      <span className="chip bg-emerald-100 text-emerald-800">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Active
                      </span>
                    ) : (
                      <span className="chip bg-navy-100 text-navy-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-navy-400" />
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile list */}
      <div className="md:hidden divide-y divide-navy-100">
        {items.map(item => {
          const cat = getCategory(item);
          return (
            <Link
              key={item.InterfaceID}
              to={`/projects/${encodeURIComponent(item.InterfaceID)}`}
              className="block p-4 hover:bg-navy-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-mono text-xs text-navy-500 mb-0.5">
                    {item.InterfaceID}
                  </div>
                  <div className="font-medium text-navy-900 truncate">
                    {item.InterfaceName}
                  </div>
                </div>
                <span className={`chip ${getCategoryBg(cat)} flex-shrink-0`}>
                  {cat}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2 text-xs text-navy-600">
                <span>{item.SourceApplication}</span>
                <span>→</span>
                <span>{item.TargetApplication}</span>
                <span className="text-navy-400">·</span>
                <span>{item.InterfaceFrequency}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-navy-600">
      {children}
    </th>
  );
}
