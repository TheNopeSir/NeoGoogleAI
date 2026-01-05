
import React, { useEffect, useState } from 'react';
import { Database, AlertTriangle, Trash2 } from 'lucide-react';
import { getStorageEstimate, clearLocalCache } from '../services/storageService';

interface StorageMonitorProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
}

const StorageMonitor: React.FC<StorageMonitorProps> = ({ theme }) => {
    const [stats, setStats] = useState<{usage: number, quota: number, percentage: number} | null>(null);

    // Fix: Explicitly handle StorageEstimate object and calculate percentage manually to match required state type
    useEffect(() => {
        getStorageEstimate().then((estimate) => {
            if (estimate) {
                const usage = estimate.usage || 0;
                const quota = estimate.quota || 1;
                setStats({
                    usage,
                    quota,
                    percentage: (usage / quota) * 100
                });
            }
        });
    }, []);

    if (!stats) return null;

    const formatBytes = (bytes: number, decimals = 2) => {
        if (!+bytes) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    };

    const isCritical = stats.percentage > 90;
    const isWarning = stats.percentage > 70;
    const isWinamp = theme === 'winamp';
    
    let colorClass = 'bg-green-500';
    if (isWarning) colorClass = 'bg-yellow-500';
    if (isCritical) colorClass = 'bg-red-500';

    return (
        <div className={`p-4 rounded border animate-in fade-in slide-in-from-bottom-2 ${isWinamp ? 'bg-[#191919] border-[#505050] text-[#00ff00]' : theme === 'dark' ? 'bg-dark-surface border-dark-dim' : 'bg-white border-light-dim'}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 font-pixel text-xs">
                    <Database size={14} />
                    <span>ХРАНИЛИЩЕ УСТРОЙСТВА</span>
                </div>
                <span className="font-mono text-xs font-bold">{stats.percentage.toFixed(1)}%</span>
            </div>
            
            <div className={`w-full h-2 rounded-full overflow-hidden ${isWinamp ? 'bg-[#282828]' : theme === 'dark' ? 'bg-gray-800' : 'bg-gray-200'} mb-2`}>
                <div className={`h-full transition-all duration-500 ${colorClass}`} style={{ width: `${stats.percentage}%` }}></div>
            </div>
            
            <div className="flex justify-between text-[10px] font-mono opacity-70 mb-4">
                <span>ИСПОЛЬЗОВАНО: {formatBytes(stats.usage)}</span>
                <span>ВСЕГО: {formatBytes(stats.quota)}</span>
            </div>

            {isCritical && (
                <div className="flex items-center gap-2 text-red-500 text-xs font-bold mb-4 animate-pulse">
                    <AlertTriangle size={14} />
                    <span>ВНИМАНИЕ: МАЛО МЕСТА!</span>
                </div>
            )}

            <button 
                onClick={() => {
                    if(confirm("Вы уверены? Это удалит локальную копию данных и изображений. Данные, синхронизированные с облаком, останутся.")) {
                        clearLocalCache();
                    }
                }}
                className="w-full py-2 flex items-center justify-center gap-2 border border-red-500 text-red-500 hover:bg-red-500/10 rounded text-xs font-pixel font-bold transition-colors"
            >
                <Trash2 size={14} /> ОЧИСТИТЬ КЭШ
            </button>
            <p className="text-[9px] opacity-50 mt-2 text-center">Очистка кэша освободит место, удалив сохраненные изображения. Приложение перезагрузится.</p>
        </div>
    );
};

export default StorageMonitor;