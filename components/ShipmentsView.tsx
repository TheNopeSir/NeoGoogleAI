import React, { useState } from 'react';
import { ArrowLeft, Package, PackageCheck, PackageSearch, Truck } from 'lucide-react';
import type { TradeRequest, UserProfile } from '../types';
import { confirmDelivery } from '../services/storageService';
import { shipmentStatusLabel } from '../services/deliveryService';
import ShipmentTracker from './delivery/ShipmentTracker';

interface Props {
    tradeRequests: TradeRequest[];
    currentUser: UserProfile;
    onBack: () => void;
    embedded?: boolean;
}

type Tab = 'outgoing' | 'incoming';

const STATUS_ICONS: Record<string, React.ReactNode> = {
    PENDING: <Package size={16} className="text-yellow-400" />,
    CREATED: <PackageSearch size={16} className="text-blue-400" />,
    IN_TRANSIT: <Truck size={16} className="text-orange-400" />,
    DELIVERED: <PackageCheck size={16} className="text-green-400" />,
    FAILED: <Package size={16} className="text-red-400" />,
    SHIPPING_PENDING: <Package size={16} className="text-yellow-400" />,
};

export default function ShipmentsView({ tradeRequests, currentUser, onBack, embedded }: Props) {
    const [tab, setTab] = useState<Tab>('outgoing');
    const [trackingReq, setTrackingReq] = useState<TradeRequest | null>(null);
    const [confirming, setConfirming] = useState<string | null>(null);

    const shipmentsOnly = tradeRequests.filter(r => !!r.shipment);

    const outgoing = shipmentsOnly.filter(r => r.sender === currentUser.username);
    const incoming = shipmentsOnly.filter(r => r.recipient === currentUser.username);

    const displayed = tab === 'outgoing' ? outgoing : incoming;

    async function handleConfirm(id: string) {
        setConfirming(id);
        try {
            await confirmDelivery(id);
            setTrackingReq(null);
        } finally {
            setConfirming(null);
        }
    }

    function statusBadge(req: TradeRequest) {
        const s = req.shipment?.status ?? req.status;
        const label = shipmentStatusLabel(s as any);
        return (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-[var(--color-bg-tertiary)]">
                {STATUS_ICONS[s] ?? <Package size={14} />}
                {label}
            </span>
        );
    }

    return (
        <div className="flex flex-col h-full bg-[var(--color-bg-primary)]">
            {/* Header — hidden when embedded in profile */}
            {!embedded && (
                <div className="flex items-center gap-3 p-4 border-b border-[var(--color-border)] shrink-0">
                    <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors">
                        <ArrowLeft size={20} className="text-[var(--color-text-secondary)]" />
                    </button>
                    <div>
                        <h1 className="font-semibold text-[var(--color-text-primary)]">Мои Отправки</h1>
                        <p className="text-xs text-[var(--color-text-secondary)]">Яндекс Доставка</p>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-[var(--color-border)] shrink-0">
                <button
                    onClick={() => setTab('outgoing')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        tab === 'outgoing'
                            ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                            : 'text-[var(--color-text-secondary)]'
                    }`}
                >
                    Исходящие ({outgoing.length})
                </button>
                <button
                    onClick={() => setTab('incoming')}
                    className={`flex-1 py-3 text-sm font-medium transition-colors ${
                        tab === 'incoming'
                            ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                            : 'text-[var(--color-text-secondary)]'
                    }`}
                >
                    Входящие ({incoming.length})
                </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
                {displayed.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-20 text-[var(--color-text-secondary)]">
                        <Package size={40} className="opacity-30" />
                        <p className="text-sm">Отправок пока нет</p>
                        <p className="text-xs opacity-60 text-center px-8">
                            Отправки появятся здесь когда вы оформите обмен с доставкой
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col divide-y divide-[var(--color-border)]">
                        {displayed.map(req => {
                            const shipment = req.shipment!;
                            const isIncoming = req.recipient === currentUser.username;
                            const canConfirm = isIncoming &&
                                (shipment.status === 'IN_TRANSIT' || shipment.status === 'DELIVERED') &&
                                req.status !== 'COMPLETED';

                            return (
                                <div key={req.id} className="p-4">
                                    {/* Top row */}
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div>
                                            <p className="text-sm font-medium text-[var(--color-text-primary)]">
                                                {isIncoming ? `От @${req.sender}` : `Для @${req.recipient}`}
                                            </p>
                                            {shipment.trackingId && (
                                                <p className="text-xs font-mono text-[var(--color-text-secondary)] mt-0.5">
                                                    {shipment.trackingId}
                                                </p>
                                            )}
                                        </div>
                                        {statusBadge(req)}
                                    </div>

                                    {/* Address */}
                                    <div className="flex items-center gap-1.5 mb-3">
                                        {shipment.method === 'COURIER' ? (
                                            <Truck size={12} className="text-[var(--color-text-secondary)] shrink-0" />
                                        ) : (
                                            <Package size={12} className="text-[var(--color-text-secondary)] shrink-0" />
                                        )}
                                        <p className="text-xs text-[var(--color-text-secondary)] truncate">
                                            {shipment.method === 'COURIER'
                                                ? `${shipment.recipientAddress?.city}, ${shipment.recipientAddress?.street}`
                                                : shipment.pickupPointAddress ?? 'Пункт выдачи'}
                                        </p>
                                    </div>

                                    {/* Cost + actions */}
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-[var(--color-text-secondary)]">
                                            Доставка: <span className="text-[var(--color-text-primary)] font-medium">{shipment.cost} ₽</span>
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setTrackingReq(req)}
                                                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-bg-secondary)] transition-colors text-[var(--color-text-secondary)]"
                                            >
                                                Отследить
                                            </button>
                                            {canConfirm && (
                                                <button
                                                    onClick={() => handleConfirm(req.id)}
                                                    disabled={confirming === req.id}
                                                    className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-accent)] text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                                >
                                                    {confirming === req.id ? 'Подтверждаем…' : 'Получил'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Shipment tracker modal */}
            {trackingReq?.shipment && (
                <ShipmentTracker
                    shipment={trackingReq.shipment}
                    isRecipient={trackingReq.recipient === currentUser.username}
                    onConfirmDelivery={() => handleConfirm(trackingReq.id)}
                    onClose={() => setTrackingReq(null)}
                />
            )}
        </div>
    );
}
