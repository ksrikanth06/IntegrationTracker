import { useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import data from '../data/interfaces.json';
import type { Interface } from '../types';
import { getCategoryBg, formatDateTime, getCategory } from '../lib/utils';

const interfaces = data as Interface[];

export default function ProjectDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const item = useMemo(
    () =>
      interfaces.find(
        i => i.InterfaceID === decodeURIComponent(id || '')
      ),
    [id]
  );

  if (!item) {
    return (
      <div className="w-full px-6 lg:px-8 py-12">
        <div className="card p-12 text-center">
          <p className="font-display text-2xl font-bold text-navy-900 mb-2">
            Project not found
          </p>
          <p className="text-sm text-navy-600 mb-6">
            No interface with ID “{id}” exists in the catalog.
          </p>
          <Link to="/" className="btn-primary">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  const cat = getCategory(item);
  const related = interfaces.filter(
    i => i.DataObject === item.DataObject && i.InterfaceID !== item.InterfaceID
  );

  return (
    <div className="w-full px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      {/* Breadcrumb / back */}
      <div className="flex items-center gap-2 text-sm text-navy-600">
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-1 hover:text-rail"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M15 18l-6-6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back
        </button>
        <span className="text-navy-300">/</span>
        <Link to="/" className="hover:text-rail">
          Dashboard
        </Link>
        <span className="text-navy-300">/</span>
        <span className="font-mono text-xs text-navy-700">{item.InterfaceID}</span>
      </div>

      {/* Header */}
      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`chip ${getCategoryBg(cat)}`}>{cat}</span>
              <span className="chip bg-navy-100 text-navy-800 font-semibold">
                {item.InterfacePriority}
              </span>
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
            </div>
            <h1 className="font-display text-2xl lg:text-3xl font-bold text-navy-900">
              {item.InterfaceName}
            </h1>
            <p className="mt-1 font-mono text-xs text-navy-500">
              {item.InterfaceID}
            </p>
          </div>
        </div>

        <p className="mt-4 text-navy-700 leading-relaxed">{item.Description}</p>
      </div>

      {/* Flow diagram */}
      <div className="card p-6">
        <h2 className="font-display text-lg font-semibold text-navy-900 mb-4">
          Integration flow
        </h2>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex-1 rounded-md border border-navy-200 bg-navy-50 p-4">
            <p className="text-xs uppercase tracking-wider text-navy-500 mb-1">
              Source
            </p>
            <p className="font-display text-xl font-semibold text-navy-900">
              {item.SourceApplication}
            </p>
            <p className="mt-1 text-xs text-navy-600">
              Protocol · <span className="font-medium">{item.SourceProtocol}</span>
            </p>
          </div>

          <div className="flex flex-col items-center text-navy-400">
            <svg
              width="40"
              height="24"
              viewBox="0 0 40 24"
              fill="none"
              className="hidden sm:block"
            >
              <path
                d="M2 12h36M30 4l8 8-8 8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <svg
              width="24"
              height="32"
              viewBox="0 0 24 32"
              fill="none"
              className="sm:hidden"
            >
              <path
                d="M12 2v28M4 22l8 8 8-8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="mt-1 text-xs uppercase tracking-wider">
              {item.InterfaceFrequency}
            </span>
          </div>

          <div className="flex-1 rounded-md border border-navy-200 bg-navy-50 p-4">
            <p className="text-xs uppercase tracking-wider text-navy-500 mb-1">
              Target
            </p>
            <p className="font-display text-xl font-semibold text-navy-900">
              {item.TargetApplication}
            </p>
            <p className="mt-1 text-xs text-navy-600">
              Protocol · <span className="font-medium">{item.TargetProtocol}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Detail grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Specification">
          <Field label="Data object" value={item.DataObject} />
          <Field label="Package" value={item.PackageName} mono />
          <Field label="Priority" value={item.InterfacePriority} />
          <Field label="Frequency" value={item.InterfaceFrequency} />
          <Field label="Category" value={cat} />
        </Section>

        <Section title="Audit">
          <Field label="Created by" value={item.CreatedBy ?? '—'} />
          <Field label="Created on" value={formatDateTime(item.CreatedDate)} />
          <Field label="Modified by" value={item.ModifiedBy ?? '—'} />
          <Field label="Modified on" value={formatDateTime(item.ModifiedDate)} />
          <Field
            label="Status"
            value={item.IsActive === 1 ? 'Active' : 'Inactive'}
          />
        </Section>
      </div>

      {/* Related */}
      {related.length > 0 && (
        <div className="card p-6">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-lg font-semibold text-navy-900">
              Related interfaces
            </h2>
            <span className="text-xs uppercase tracking-wider text-navy-500">
              Same data object · {related.length}
            </span>
          </div>
          <div className="divide-y divide-navy-100">
            {related.map(r => (
              <Link
                key={r.InterfaceID}
                to={`/projects/${encodeURIComponent(r.InterfaceID)}`}
                className="block py-3 hover:bg-navy-50 -mx-2 px-2 rounded transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-navy-500">
                        {r.InterfaceID}
                      </span>
                      <span className={`chip ${getCategoryBg(getCategory(r))}`}>
                        {getCategory(r)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-sm text-navy-700 truncate">
                      {r.SourceApplication} → {r.TargetApplication}
                    </div>
                  </div>
                  <span className="text-xs text-navy-500 whitespace-nowrap">
                    {r.InterfaceFrequency}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card p-6">
      <h2 className="font-display text-lg font-semibold text-navy-900 mb-4">
        {title}
      </h2>
      <dl className="space-y-3">{children}</dl>
    </div>
  );
}

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-3 items-baseline">
      <dt className="text-xs uppercase tracking-wider text-navy-500 col-span-1">
        {label}
      </dt>
      <dd
        className={`col-span-2 text-sm text-navy-900 ${mono ? 'font-mono text-xs' : ''}`}
      >
        {value}
      </dd>
    </div>
  );
}
