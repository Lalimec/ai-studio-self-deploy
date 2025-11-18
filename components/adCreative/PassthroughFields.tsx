/**
 * PassthroughFields Component
 * Webhook passthrough configuration for Ad Creative Studio
 */

import React from 'react';
import { WebhookPassthrough } from '../../types';

interface PassthroughFieldsProps {
  fields: WebhookPassthrough;
  onUpdateField: (field: keyof WebhookPassthrough, value: string) => void;
  appCodeOptions: { id: string; name: string }[];
  designerOptions: { id: string; name: string }[];
}

export default function PassthroughFields({
  fields,
  onUpdateField,
  appCodeOptions,
  designerOptions,
}: PassthroughFieldsProps) {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-[var(--color-text-main)]">
        Webhook Passthrough Configuration
      </h2>

      <div className="bg-[var(--color-bg-surface)] rounded-lg p-6 space-y-4">
        {/* Ad Name */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--color-text-main)]">
            Ad Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fields.adName}
            onChange={(e) => onUpdateField('adName', e.target.value)}
            placeholder="e.g., hair-white-man-middle-aged-06-v2"
            className="w-full px-4 py-2 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border)] text-[var(--color-text-main)] placeholder-[var(--color-text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        {/* Code */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--color-text-main)]">
            Code <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fields.code}
            onChange={(e) => onUpdateField('code', e.target.value)}
            placeholder="e.g., 5345-v1"
            className="w-full px-4 py-2 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border)] text-[var(--color-text-main)] placeholder-[var(--color-text-dim)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          />
        </div>

        {/* App Code */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--color-text-main)]">
            App Code <span className="text-red-500">*</span>
          </label>
          <select
            value={fields.appCode}
            onChange={(e) => onUpdateField('appCode', e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            {appCodeOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        {/* Designer */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--color-text-main)]">
            Designer <span className="text-red-500">*</span>
          </label>
          <select
            value={fields.designer}
            onChange={(e) => onUpdateField('designer', e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border)] text-[var(--color-text-main)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
          >
            {designerOptions.map(option => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>

        {/* Template Name (Read-only) */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--color-text-main)]">
            Template Name (Auto-filled)
          </label>
          <input
            type="text"
            value={fields.templateName}
            readOnly
            className="w-full px-4 py-2 rounded-lg bg-[var(--color-bg-muted)] border border-[var(--color-border)] text-[var(--color-text-dim)] cursor-not-allowed"
          />
        </div>

        {/* Today (Read-only) */}
        <div>
          <label className="block text-sm font-medium mb-2 text-[var(--color-text-main)]">
            Date (Auto-generated)
          </label>
          <input
            type="text"
            value={fields.today}
            readOnly
            className="w-full px-4 py-2 rounded-lg bg-[var(--color-bg-muted)] border border-[var(--color-border)] text-[var(--color-text-dim)] cursor-not-allowed"
          />
          <p className="text-xs text-[var(--color-text-dim)] mt-1">
            Format: YYYYMMDD
          </p>
        </div>
      </div>

      {/* Preview JSON */}
      <div className="mt-6 bg-[var(--color-bg-surface)] rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2 text-[var(--color-text-main)]">
          Webhook Passthrough Preview
        </h3>
        <pre className="text-xs bg-[var(--color-bg-base)] p-3 rounded overflow-x-auto text-[var(--color-text-dim)]">
          {JSON.stringify(fields, null, 2)}
        </pre>
      </div>
    </div>
  );
}
