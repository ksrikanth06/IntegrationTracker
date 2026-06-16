import { useState } from 'react';
import type { Interface, ProjectOps } from '../types';

const PROTOCOLS = [
  'HTTPS(Rest API)',
  'Internal SFTP',
  'External SFTP',
  'JMS',
  'Webservice',
  'JDBC',
  'LDAP',
  'Other',
];

const FREQUENCIES = ['Real Time', 'Daily Once', 'Periodically', 'Yearly Once', 'Other'];

interface Props {
  onSave: (item: Interface) => void | Promise<void>;
  onClose: () => void;
  createdBy: string;
  saving?: boolean;
  saveError?: string | null;
}

type FormState = {
  InterfaceID: string;
  InterfaceName: string;
  DataObject: string;
  Description: string;
  PackageName: string;
  InterfacePriority: string;
  InterfaceFrequency: string;
  frequencyOther: string;
  SourceApplication: string;
  SourceProtocol: string;
  sourceProtocolOther: string;
  TargetApplication: string;
  TargetProtocol: string;
  targetProtocolOther: string;
  ProjectOps: ProjectOps;
  IsActive: number;
};

const empty: FormState = {
  InterfaceID: '',
  InterfaceName: '',
  DataObject: '',
  Description: '',
  PackageName: '',
  InterfacePriority: 'P1',
  InterfaceFrequency: 'Daily Once',
  frequencyOther: '',
  SourceApplication: '',
  SourceProtocol: 'HTTPS(Rest API)',
  sourceProtocolOther: '',
  TargetApplication: '',
  TargetProtocol: 'HTTPS(Rest API)',
  targetProtocolOther: '',
  ProjectOps: 'MOBILITY',
  IsActive: 1,
};

type Errors = Partial<Record<keyof FormState, string>>;

export default function AddIntegrationModal({ onSave, onClose, createdBy, saving = false, saveError = null }: Props) {
  const [form, setForm] = useState<FormState>(empty);
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(f => ({ ...f, [key]: value }));

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.InterfaceID.trim()) e.InterfaceID = 'Required';
    if (!form.InterfaceName.trim()) e.InterfaceName = 'Required';
    if (!form.DataObject.trim()) e.DataObject = 'Required';
    if (!form.SourceApplication.trim()) e.SourceApplication = 'Required';
    if (!form.TargetApplication.trim()) e.TargetApplication = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      InterfaceID: form.InterfaceID.trim(),
      InterfaceName: form.InterfaceName.trim(),
      DataObject: form.DataObject.trim(),
      Description: form.Description.trim(),
      PackageName: form.PackageName.trim(),
      InterfacePriority: form.InterfacePriority,
      InterfaceFrequency:
        form.InterfaceFrequency === 'Other' ? form.frequencyOther : form.InterfaceFrequency,
      SourceApplication: form.SourceApplication.trim(),
      SourceProtocol:
        form.SourceProtocol === 'Other' ? form.sourceProtocolOther : form.SourceProtocol,
      TargetApplication: form.TargetApplication.trim(),
      TargetProtocol:
        form.TargetProtocol === 'Other' ? form.targetProtocolOther : form.TargetProtocol,
      ProjectOps: form.ProjectOps,
      IsActive: form.IsActive,
      CreatedDate: new Date().toISOString(),
      CreatedBy: createdBy,
      ModifiedBy: null,
      ModifiedDate: null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl sm:mx-4 bg-white sm:rounded-xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-navy-100 shrink-0">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-navy-500 font-medium mb-0.5">
              Catalog
            </p>
            <h2 className="font-display text-xl font-bold text-navy-900">Add Integration</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="btn-ghost !p-1.5 rounded-full">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {/* Integration Info */}
          <section>
            <SectionHeading>Integration Info</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Interface ID" required error={errors.InterfaceID}>
                <input
                  className="input"
                  value={form.InterfaceID}
                  onChange={e => set('InterfaceID', e.target.value)}
                  placeholder="e.g. 2001"
                />
              </Field>
              <Field label="Interface Name" required error={errors.InterfaceName}>
                <input
                  className="input"
                  value={form.InterfaceName}
                  onChange={e => set('InterfaceName', e.target.value)}
                  placeholder="e.g. ERH Employee Master"
                />
              </Field>
              <Field label="Data Object" required error={errors.DataObject}>
                <input
                  className="input"
                  value={form.DataObject}
                  onChange={e => set('DataObject', e.target.value)}
                  placeholder="e.g. Employee Master"
                />
              </Field>
              <Field label="Package Name">
                <input
                  className="input"
                  value={form.PackageName}
                  onChange={e => set('PackageName', e.target.value)}
                  placeholder="e.g. ERHHCMEmpMasterPub"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Description">
                  <textarea
                    className="input resize-none"
                    rows={2}
                    value={form.Description}
                    onChange={e => set('Description', e.target.value)}
                    placeholder="Brief description of what this interface does…"
                  />
                </Field>
              </div>
            </div>
          </section>

          {/* Classification */}
          <section>
            <SectionHeading>Classification</SectionHeading>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Field label="Category">
                <select
                  className="input"
                  value={form.ProjectOps}
                  onChange={e => set('ProjectOps', e.target.value as ProjectOps)}
                >
                  <option value="MOBILITY">Mobility</option>
                  <option value="ERP">ERP</option>
                  <option value="FREIGHT">Freight</option>
                </select>
              </Field>
              <Field label="Priority">
                <select
                  className="input"
                  value={form.InterfacePriority}
                  onChange={e => set('InterfacePriority', e.target.value)}
                >
                  <option>P1</option>
                  <option>P2</option>
                  <option>P3</option>
                  <option>P4</option>
                </select>
              </Field>
              <Field label="Status">
                <select
                  className="input"
                  value={form.IsActive}
                  onChange={e => set('IsActive', Number(e.target.value))}
                >
                  <option value={1}>Active</option>
                  <option value={0}>Inactive</option>
                </select>
              </Field>
              <Field label="Frequency">
                <select
                  className="input"
                  value={form.InterfaceFrequency}
                  onChange={e => set('InterfaceFrequency', e.target.value)}
                >
                  {FREQUENCIES.map(f => (
                    <option key={f}>{f}</option>
                  ))}
                </select>
                {form.InterfaceFrequency === 'Other' && (
                  <input
                    className="input mt-2"
                    value={form.frequencyOther}
                    onChange={e => set('frequencyOther', e.target.value)}
                    placeholder="Specify…"
                  />
                )}
              </Field>
            </div>
          </section>

          {/* Source & Target */}
          <section>
            <SectionHeading>Source & Target</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Source Application" required error={errors.SourceApplication}>
                <input
                  className="input"
                  value={form.SourceApplication}
                  onChange={e => set('SourceApplication', e.target.value)}
                  placeholder="e.g. OCF-HCM"
                />
              </Field>
              <Field label="Source Protocol">
                <select
                  className="input"
                  value={form.SourceProtocol}
                  onChange={e => set('SourceProtocol', e.target.value)}
                >
                  {PROTOCOLS.map(p => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                {form.SourceProtocol === 'Other' && (
                  <input
                    className="input mt-2"
                    value={form.sourceProtocolOther}
                    onChange={e => set('sourceProtocolOther', e.target.value)}
                    placeholder="Specify protocol…"
                  />
                )}
              </Field>
              <Field label="Target Application" required error={errors.TargetApplication}>
                <input
                  className="input"
                  value={form.TargetApplication}
                  onChange={e => set('TargetApplication', e.target.value)}
                  placeholder="e.g. SAP PM"
                />
              </Field>
              <Field label="Target Protocol">
                <select
                  className="input"
                  value={form.TargetProtocol}
                  onChange={e => set('TargetProtocol', e.target.value)}
                >
                  {PROTOCOLS.map(p => (
                    <option key={p}>{p}</option>
                  ))}
                </select>
                {form.TargetProtocol === 'Other' && (
                  <input
                    className="input mt-2"
                    value={form.targetProtocolOther}
                    onChange={e => set('targetProtocolOther', e.target.value)}
                    placeholder="Specify protocol…"
                  />
                )}
              </Field>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-navy-100 bg-navy-50/40 px-6 py-4">
          {saveError && (
            <p className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-rail font-medium">
              {saveError}
            </p>
          )}
          <div className="flex items-center justify-end gap-3">
            <button onClick={onClose} disabled={saving} className="btn-ghost">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="btn-primary gap-2">
              {saving && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z" />
                </svg>
              )}
              {saving ? 'Saving…' : 'Save Integration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs uppercase tracking-[0.18em] text-navy-500 font-semibold mb-3 pb-2 border-b border-navy-100">
      {children}
    </h3>
  );
}

function Field({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-navy-600 mb-1.5">
        {label}
        {required && <span className="ml-0.5 text-rail">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-rail font-medium">{error}</p>}
    </div>
  );
}
