import React, { useEffect, useState } from 'react';
import { CheckCircle, Circle, Clock, Package, Truck, X } from 'lucide-react';
import type { ShipmentInfo, ShipmentStatus } from '../../types';
import { shipmentStatusLabel, trackShipment } from '../../services/deliveryService';
import XI from '../XI';

interface Props {
    shipment: ShipmentInfo;
    isRecipient: boolean;
    onConfirmDelivery?: () => void;
    onClose: () => void;
}

const STEPS: { status: ShipmentStatus; label: string; icon: React.ReactNode }[] = [
    { status: 'PENDING', label: 'Ожидает передачи', icon: <XI icon={Clock} size={16} /> },
    { status: 'CREATED', label: 'Передан курьеру', icon: <XI icon={Package} size={16} /> },
    { status: 'IN_TRANSIT', label: 'В пути', icon: <XI icon={Truck} size={16} /> },
    { status: 'DELIVERED', label: 'Доставлен', icon: <XI icon={CheckCircle} size={16} /> },
];

const STATUS_ORDER: ShipmentStatus[] = ['PENDING', 'CREATED', 'IN_TRANSIT', 'DELIVERED'];

function stepIndex(status: ShipmentStatus): number {
    return STATUS_ORDER.indexOf(status);
}

export default function ShipmentTracker({ shipment, isRecipient, onConfirmDelivery, onClose }: Props) {
    const [liveStatus, setLiveStatus] = useState<ShipmentStatus>(shipment.status);
    const [refreshing, setRefreshing] = useState(false);

    const currentIdx = stepIndex(liveStatus);

    async function refresh() {
        if (!shipment.trackingId) return;
        setRefreshing(true);
        try {
            const s = await trackShipment(shipment.trackingId);
            setLiveStatus(s);
        } finally {
            setRefreshing(false);
        }
    }

    // Auto-refresh every 30s
    useEffect(() => {
        if (!shipment.trackingId || liveStatus === 'DELIVERED' || liveStatus === 'FAILED') return;
        const id = setInterval(refresh, 30_000);
        return () => clearInterval(id);
    }, [shipment.trackingId, liveStatus]);

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[var(--color-bg-primary)] rounded-t-2xl p-5 pb-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <p className="font-semibold text-[var(--color-text-primary)]">Отслеживание доставки</p>
                        {shipment.trackingId && (
                            <p className="text-xs text-[var(--color-text-secondary)] font-mono mt-0.5">
                                {shipment.trackingId}
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors">
                        <XI icon={X} size={18} className="text-[var(--color-text-secondary)]" />
                    </button>
                </div>

                {/* Timeline */}
                <div className="flex flex-col gap-0 mb-5">
                    {STEPS.map((step, idx) => {
                        const done = idx <= currentIdx;
                        const active = idx === currentIdx;
                        const isLast = idx === STEPS.length - 1;
                        return (
                            <div key={step.status} className="flex items-start gap-3">
                                {/* Icon + line */}
                                <div className="flex flex-col items-center shrink-0">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                                        done
                                            ? active
                                                ? 'border-[var(--color-accent)] bg-[var(--color-accent)] text-white'
                                                : 'border-[var(--color-accent)] bg-[var(--color-accent)]/20 text-[var(--color-accent)]'
                                            : 'border-[var(--color-border)] bg-[var(--color-bg-secondary)] text-[var(--color-text-secondary)]'
                                    }`}>
                                        {done && !active ? <XI icon={CheckCircle} size={14} /> : step.icon}
                                    </div>
                                    {!isLast && (
                                        <div className={`w-0.5 h-6 mt-1 mb-1 rounded-full ${
                                            idx < currentIdx ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'
                                        }`} />
                                    )}
                                </div>
                                {/* Label */}
                                <div className="pt-1.5 pb-4">
                                    <p className={`text-sm ${active ? 'font-semibold text-[var(--color-text-primary)]' : done ? 'text-[var(--color-text-secondary)]' : 'text-[var(--color-text-secondary)] opacity-50'}`}>
                                        {step.label}
                                    </p>
                                    {active && shipment.estimatedDelivery && (
                                        <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
                                            Ожидаемая дата: {new Date(shipment.estimatedDelivery).toLocaleDateString('ru-RU')}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Delivery details */}
                <div className="bg-[var(--color-bg-secondary)] rounded-xl p-3 mb-4 text-xs text-[var(--color-text-secondary)] space-y-1">
                    <p>
                        <span className="text-[var(--color-text-primary)]">Способ: </span>
                        {shipment.method === 'COURIER' ? 'Курьер до двери' : 'Пункт выдачи'}
                    </p>
                    {shipment.method === 'PICKUP_POINT' && shipment.pickupPointAddress && (
                        <p><span className="text-[var(--color-text-primary)]">ПВЗ: </span>{shipment.pickupPointAddress}</p>
                    )}
                    <p><span className="text-[var(--color-text-primary)]">Стоимость: </span>{shipment.cost} ₽</p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button
                        onClick={refresh}
                        disabled={refreshing}
                        className="flex-1 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] transition-colors disabled:opacity-50"
                    >
                        {refreshing ? 'Обновляем…' : 'Обновить статус'}
                    </button>
                    {isRecipient && (liveStatus === 'DELIVERED' || liveStatus === 'IN_TRANSIT') && onConfirmDelivery && (
                        <button
                            onClick={onConfirmDelivery}
                            className="flex-1 py-2.5 rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                        >
                            Подтвердить получение
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
