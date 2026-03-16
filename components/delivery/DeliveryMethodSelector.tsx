import React, { useEffect, useState } from 'react';
import { Package, Truck } from 'lucide-react';
import type { DeliveryMethod, DeliveryTariff, ShippingAddress } from '../../types';
import { calculateTariffs, isMockMode } from '../../services/deliveryService';

interface Props {
    fromCity: string;
    toCity: string;
    selected: DeliveryMethod | null;
    onSelect: (method: DeliveryMethod, tariff: DeliveryTariff) => void;
}

export default function DeliveryMethodSelector({ fromCity, toCity, selected, onSelect }: Props) {
    const [tariffs, setTariffs] = useState<DeliveryTariff[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        const from = { city: fromCity } as ShippingAddress;
        const to = { city: toCity } as ShippingAddress;
        calculateTariffs(from, to, 1)
            .then(setTariffs)
            .finally(() => setLoading(false));
    }, [fromCity, toCity]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8 gap-2 text-[var(--color-text-secondary)]">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Рассчитываем тарифы…</span>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                Способ доставки
                {isMockMode() && (
                    <span className="ml-2 text-xs font-normal text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                        Demo
                    </span>
                )}
            </p>
            {tariffs.map(t => (
                <button
                    key={t.method}
                    onClick={() => onSelect(t.method, t)}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
                        selected === t.method
                            ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                            : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] hover:border-[var(--color-accent)]/50'
                    }`}
                >
                    <div className={`p-2 rounded-lg ${selected === t.method ? 'bg-[var(--color-accent)]/20' : 'bg-[var(--color-bg-tertiary)]'}`}>
                        {t.method === 'COURIER' ? (
                            <Truck size={18} className={selected === t.method ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'} />
                        ) : (
                            <Package size={18} className={selected === t.method ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-secondary)]'} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">{t.label}</p>
                        <p className="text-xs text-[var(--color-text-secondary)]">
                            {t.days === 1 ? '1 день' : `${t.days} дня`}
                        </p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--color-accent)] shrink-0">
                        {t.cost} ₽
                    </span>
                </button>
            ))}
        </div>
    );
}
