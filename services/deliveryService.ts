import type { DeliveryMethod, DeliveryTariff, PickupPoint, ShipmentInfo, ShipmentStatus, ShippingAddress } from '../types';

const IS_MOCK = !import.meta.env.VITE_YANDEX_DELIVERY_TOKEN;
const API_BASE = '/api/delivery';

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_PICKUP_POINTS: PickupPoint[] = [
    {
        id: 'pvz-msk-001',
        name: 'Яндекс ПВЗ — Арбат',
        address: 'Москва, ул. Арбат, д. 12',
        lat: 55.7494,
        lon: 37.5929,
        workingHours: 'Пн–Вс: 9:00–21:00',
        provider: 'yandex',
    },
    {
        id: 'pvz-msk-002',
        name: 'Яндекс ПВЗ — Тверская',
        address: 'Москва, Тверская ул., д. 7',
        lat: 55.7634,
        lon: 37.6066,
        workingHours: 'Пн–Сб: 10:00–22:00',
        provider: 'yandex',
    },
    {
        id: 'pvz-msk-003',
        name: 'Яндекс ПВЗ — Таганская',
        address: 'Москва, Таганская ул., д. 3',
        lat: 55.7388,
        lon: 37.6539,
        workingHours: 'Пн–Вс: 8:00–22:00',
        provider: 'yandex',
    },
];

const MOCK_TARIFFS: DeliveryTariff[] = [
    { method: 'COURIER', cost: 390, days: 2, label: 'Курьер до двери' },
    { method: 'PICKUP_POINT', cost: 290, days: 3, label: 'Пункт выдачи' },
];

// ─── API helpers ──────────────────────────────────────────────────────────────

async function post<T>(path: string, body: unknown): Promise<T> {
    const res = await fetch(API_BASE + path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Delivery API error: ${res.status}`);
    return res.json();
}

async function get<T>(path: string): Promise<T> {
    const res = await fetch(API_BASE + path);
    if (!res.ok) throw new Error(`Delivery API error: ${res.status}`);
    return res.json();
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Calculate available delivery tariffs from one city to another.
 * In mock-mode always returns 2 flat rates.
 */
export async function calculateTariffs(
    _from: ShippingAddress,
    _to: ShippingAddress,
    _weightKg: number = 1,
): Promise<DeliveryTariff[]> {
    if (IS_MOCK) {
        await delay(400);
        return MOCK_TARIFFS;
    }
    return post<DeliveryTariff[]>('/tariffs', { from: _from, to: _to, weightKg: _weightKg });
}

/**
 * Fetch pickup points for a given city name.
 * In mock-mode returns 3 Moscow test points regardless of city.
 */
export async function getPickupPoints(cityName: string): Promise<PickupPoint[]> {
    if (IS_MOCK) {
        await delay(600);
        return MOCK_PICKUP_POINTS;
    }
    return post<PickupPoint[]>('/pickup-points', { city: cityName });
}

/**
 * Create a shipment for a confirmed trade.
 * Returns a trackingId string.
 */
export async function createShipment(
    tradeId: string,
    info: Omit<ShipmentInfo, 'trackingId' | 'createdAt' | 'status'>,
): Promise<string> {
    if (IS_MOCK) {
        await delay(700);
        return `MOCK-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    }
    const result = await post<{ trackingId: string }>('/create', { tradeId, ...info });
    return result.trackingId;
}

/**
 * Get current status for a shipment by tracking ID.
 * In mock-mode advances through statuses on repeated calls.
 */
export async function trackShipment(trackingId: string): Promise<ShipmentStatus> {
    if (IS_MOCK) {
        await delay(300);
        // Cycle through statuses based on the last character of the ID for demo purposes
        const char = trackingId.at(-1) ?? '0';
        const idx = parseInt(char, 16) % 4;
        const statuses: ShipmentStatus[] = ['CREATED', 'IN_TRANSIT', 'IN_TRANSIT', 'DELIVERED'];
        return statuses[idx];
    }
    const result = await get<{ status: ShipmentStatus }>(`/track/${trackingId}`);
    return result.status;
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export function isMockMode(): boolean {
    return IS_MOCK;
}

export function formatDeliveryMethod(method: DeliveryMethod): string {
    return method === 'COURIER' ? 'Курьер до двери' : 'Пункт выдачи';
}

export function shipmentStatusLabel(status: ShipmentStatus | TradeShipmentStatus): string {
    const labels: Record<string, string> = {
        PENDING: 'Ожидает отправки',
        CREATED: 'Передан в доставку',
        IN_TRANSIT: 'В пути',
        DELIVERED: 'Доставлен',
        FAILED: 'Ошибка доставки',
        SHIPPING_PENDING: 'Ожидает отправки',
    };
    return labels[status] ?? status;
}

type TradeShipmentStatus = 'SHIPPING_PENDING' | 'IN_TRANSIT' | 'DELIVERED';
