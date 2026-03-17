import React, { useEffect, useRef, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import type { PickupPoint } from '../../types';
import { getPickupPoints } from '../../services/deliveryService';
import XI from '../XI';

interface Props {
    city: string;
    onSelect: (point: PickupPoint) => void;
    onClose: () => void;
}

export default function PickupPointMap({ city, onSelect, onClose }: Props) {
    const mapRef = useRef<HTMLDivElement>(null);
    const leafletMapRef = useRef<any>(null);
    const [points, setPoints] = useState<PickupPoint[]>([]);
    const [selected, setSelected] = useState<PickupPoint | null>(null);
    const [loading, setLoading] = useState(true);

    // Load pickup points
    useEffect(() => {
        getPickupPoints(city).then(pts => {
            setPoints(pts);
            setLoading(false);
        });
    }, [city]);

    // Init Leaflet map after points load
    useEffect(() => {
        if (loading || !mapRef.current || points.length === 0) return;
        if (leafletMapRef.current) return; // already inited

        // Leaflet loaded dynamically to avoid SSR issues
        import('leaflet').then(L => {
            // Fix default icon path for Vite
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            const map = L.map(mapRef.current!, {
                center: [points[0].lat, points[0].lon],
                zoom: 13,
                zoomControl: true,
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
            }).addTo(map);

            points.forEach(pt => {
                const marker = L.marker([pt.lat, pt.lon])
                    .addTo(map)
                    .bindPopup(`<b>${pt.name}</b><br/>${pt.address}<br/><small>${pt.workingHours}</small>`);
                marker.on('click', () => {
                    setSelected(pt);
                    marker.openPopup();
                });
            });

            leafletMapRef.current = map;
        });

        return () => {
            leafletMapRef.current?.remove();
            leafletMapRef.current = null;
        };
    }, [loading, points]);

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-[var(--color-bg-primary)]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)] shrink-0">
                <div className="flex items-center gap-2">
                    <XI icon={MapPin} size={18} className="text-[var(--color-accent)]" />
                    <span className="font-semibold text-[var(--color-text-primary)]">
                        Пункты выдачи — {city}
                    </span>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-[var(--color-bg-secondary)] transition-colors"
                >
                    <XI icon={X} size={18} className="text-[var(--color-text-secondary)]" />
                </button>
            </div>

            {/* Map */}
            <div className="flex-1 relative">
                {loading && (
                    <div className="absolute inset-0 flex items-center justify-center z-10 bg-[var(--color-bg-primary)]/80">
                        <div className="flex flex-col items-center gap-2 text-[var(--color-text-secondary)]">
                            <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
                            <span className="text-sm">Загружаем ПВЗ…</span>
                        </div>
                    </div>
                )}
                <div ref={mapRef} className="w-full h-full" />
            </div>

            {/* Bottom panel: selected point info + confirm */}
            {selected && (
                <div className="shrink-0 p-4 border-t border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                    <div className="flex items-start gap-3 mb-3">
                        <XI icon={MapPin} size={16} className="text-[var(--color-accent)] mt-0.5 shrink-0" />
                        <div>
                            <p className="text-sm font-semibold text-[var(--color-text-primary)]">{selected.name}</p>
                            <p className="text-xs text-[var(--color-text-secondary)]">{selected.address}</p>
                            <p className="text-xs text-[var(--color-text-secondary)]">{selected.workingHours}</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onSelect(selected)}
                        className="w-full py-2.5 rounded-xl bg-[var(--color-accent)] text-white text-sm font-semibold hover:opacity-90 transition-opacity"
                    >
                        Выбрать этот пункт
                    </button>
                </div>
            )}

            {/* List fallback when no point selected */}
            {!selected && !loading && (
                <div className="shrink-0 max-h-48 overflow-y-auto border-t border-[var(--color-border)]">
                    {points.map(pt => (
                        <button
                            key={pt.id}
                            onClick={() => setSelected(pt)}
                            className="w-full flex items-start gap-3 p-3 border-b border-[var(--color-border)]/50 hover:bg-[var(--color-bg-secondary)] transition-colors text-left"
                        >
                            <XI icon={MapPin} size={14} className="text-[var(--color-accent)] mt-0.5 shrink-0" />
                            <div>
                                <p className="text-sm text-[var(--color-text-primary)]">{pt.name}</p>
                                <p className="text-xs text-[var(--color-text-secondary)]">{pt.address}</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
