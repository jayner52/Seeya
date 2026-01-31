'use client';

import { Input } from '@/components/ui';
import { MONEY_TYPES, CURRENCY_OPTIONS } from '@/types/database';

interface MoneyFieldsProps {
  details: Record<string, string | number>;
  setDetails: (details: Record<string, string | number>) => void;
}

export function MoneyFields({ details, setDetails }: MoneyFieldsProps) {
  const updateField = (field: string, value: string | number) => {
    setDetails({ ...details, [field]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-seeya-text mb-1.5">
          Type
        </label>
        <select
          value={(details.moneyType as string) || ''}
          onChange={(e) => updateField('moneyType', e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all bg-white"
        >
          <option value="">Select type...</option>
          {MONEY_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-seeya-text mb-1.5">
            Currency
          </label>
          <select
            value={(details.currency as string) || ''}
            onChange={(e) => updateField('currency', e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all bg-white"
          >
            <option value="">Select...</option>
            {CURRENCY_OPTIONS.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-seeya-text mb-1.5">
            Amount
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={(details.amount as number) || ''}
            onChange={(e) => updateField('amount', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
          />
        </div>
      </div>

      <Input
        label="Description"
        placeholder="What is this for?"
        value={(details.description as string) || ''}
        onChange={(e) => updateField('description', e.target.value)}
      />
    </div>
  );
}
