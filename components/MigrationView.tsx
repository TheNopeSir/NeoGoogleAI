import React, { useState } from 'react';
import { Database, AlertCircle, CheckCircle, Loader, Book, ArrowLeft, Zap, Heart } from 'lucide-react';

interface MigrationViewProps {
    theme: 'dark' | 'light' | 'xp' | 'winamp';
    onBack: () => void;
    onMigrationComplete?: () => void;
}

interface MigrationResult {
    success: boolean;
    updated: number;
    skipped: number;
    errors?: string[];
    message?: string;
}

interface GuestbookStats {
    total: number;
    entries?: Array<{
        id: string;
        author: string;
        targetUser: string;
        text: string;
        timestamp: string;
    }>;
}

const MigrationView: React.FC<MigrationViewProps> = ({ theme, onBack, onMigrationComplete }) => {
    const [isMigrating, setIsMigrating] = useState(false);
    const [isCheckingGuestbook, setIsCheckingGuestbook] = useState(false);
    const [migrationResult, setMigrationResult] = useState<MigrationResult | null>(null);
    const [guestbookStats, setGuestbookStats] = useState<GuestbookStats | null>(null);

    const isDark = theme === 'dark';
    const isWinamp = theme === 'winamp';

    const handleMigrateReactions = async () => {
        setIsMigrating(true);
        setMigrationResult(null);

        try {
            const response = await fetch('/api/migrate-reactions', {
                method: 'POST',
            });

            const result = await response.json();

            if (response.ok) {
                setMigrationResult(result);
                // Обновляем данные в приложении после успешной миграции
                if (onMigrationComplete) {
                    onMigrationComplete();
                }
            } else {
                setMigrationResult({
                    success: false,
                    updated: 0,
                    skipped: 0,
                    message: result.error || 'Ошибка миграции',
                });
            }
        } catch (error) {
            setMigrationResult({
                success: false,
                updated: 0,
                skipped: 0,
                message: `Ошибка: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`,
            });
        } finally {
            setIsMigrating(false);
        }
    };

    const handleCheckGuestbook = async () => {
        setIsCheckingGuestbook(true);
        setGuestbookStats(null);

        try {
            const response = await fetch('/api/verify-guestbook');
            const result = await response.json();

            if (response.ok) {
                setGuestbookStats(result);
            } else {
                setGuestbookStats({
                    total: 0,
                    entries: [],
                });
            }
        } catch (error) {
            setGuestbookStats({
                total: 0,
                entries: [],
            });
        } finally {
            setIsCheckingGuestbook(false);
        }
    };

    return (
        <div className={`min-h-screen p-4 pb-24 ${isDark ? 'bg-black text-white' : 'bg-white text-black'}`}>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <button
                        onClick={onBack}
                        className={`p-2 rounded-lg transition-colors ${
                            isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'
                        }`}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            <Database size={24} />
                            Миграция данных
                        </h1>
                        <p className="text-sm opacity-60 mt-1">
                            Инструменты для миграции и проверки базы данных
                        </p>
                    </div>
                </div>

                {/* Migration Cards */}
                <div className="space-y-6">
                    {/* Reactions Migration */}
                    <div
                        className={`rounded-xl border p-6 ${
                            isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                        }`}
                    >
                        <div className="flex items-start gap-4 mb-4">
                            <div className={`p-3 rounded-lg ${isDark ? 'bg-red-500/20' : 'bg-red-500/10'}`}>
                                <Heart size={24} className="text-red-500" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold mb-2">Миграция реакций</h2>
                                <p className="text-sm opacity-70 mb-4">
                                    Конвертация всех типов реакций (FIRE, HEART, STAR, TROPHY, COOL) в простые лайки (LIKE).
                                    Все пользователи, которые реагировали, будут сохранены.
                                </p>

                                <div className={`p-4 rounded-lg mb-4 text-xs ${
                                    isDark ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-500/5 border border-yellow-500/20'
                                }`}>
                                    <div className="flex gap-2">
                                        <AlertCircle size={16} className="text-yellow-500 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="font-bold mb-1">Что произойдет:</p>
                                            <ul className="list-disc list-inside space-y-1 opacity-80">
                                                <li>Все реакции будут объединены в один тип LIKE</li>
                                                <li>Счетчики likes и likedBy будут восстановлены</li>
                                                <li>Счетчики просмотров (views) будут проверены</li>
                                                <li>История реакций пользователей сохранится</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleMigrateReactions}
                                    disabled={isMigrating}
                                    className={`px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
                                        isMigrating
                                            ? 'opacity-50 cursor-not-allowed bg-gray-500'
                                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                                    }`}
                                >
                                    {isMigrating ? (
                                        <>
                                            <Loader size={18} className="animate-spin" />
                                            Выполняется миграция...
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={18} />
                                            Запустить миграцию
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Migration Result */}
                        {migrationResult && (
                            <div
                                className={`mt-4 p-4 rounded-lg border ${
                                    migrationResult.success
                                        ? isDark
                                            ? 'bg-green-500/10 border-green-500/20'
                                            : 'bg-green-500/5 border-green-500/20'
                                        : isDark
                                        ? 'bg-red-500/10 border-red-500/20'
                                        : 'bg-red-500/5 border-red-500/20'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    {migrationResult.success ? (
                                        <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                                    )}
                                    <div className="flex-1">
                                        <p className="font-bold mb-2">
                                            {migrationResult.success ? '✅ Миграция завершена!' : '❌ Ошибка миграции'}
                                        </p>
                                        {migrationResult.success ? (
                                            <div className="text-sm opacity-80 space-y-1">
                                                <p>📊 Обновлено экспонатов: <span className="font-bold">{migrationResult.updated}</span></p>
                                                <p>⏭️ Пропущено (без изменений): <span className="font-bold">{migrationResult.skipped}</span></p>
                                                {migrationResult.message && <p className="mt-2">{migrationResult.message}</p>}
                                            </div>
                                        ) : (
                                            <p className="text-sm opacity-80">{migrationResult.message}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Guestbook Verification */}
                    <div
                        className={`rounded-xl border p-6 ${
                            isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                        }`}
                    >
                        <div className="flex items-start gap-4 mb-4">
                            <div className={`p-3 rounded-lg ${isDark ? 'bg-purple-500/20' : 'bg-purple-500/10'}`}>
                                <Book size={24} className="text-purple-500" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-bold mb-2">Проверка гостевой книги</h2>
                                <p className="text-sm opacity-70 mb-4">
                                    Проверка состояния таблицы гостевой книги и отображение статистики.
                                </p>

                                <button
                                    onClick={handleCheckGuestbook}
                                    disabled={isCheckingGuestbook}
                                    className={`px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 ${
                                        isCheckingGuestbook
                                            ? 'opacity-50 cursor-not-allowed bg-gray-500'
                                            : 'bg-purple-500 hover:bg-purple-600 text-white'
                                    }`}
                                >
                                    {isCheckingGuestbook ? (
                                        <>
                                            <Loader size={18} className="animate-spin" />
                                            Проверка...
                                        </>
                                    ) : (
                                        <>
                                            <Database size={18} />
                                            Проверить гостевую книгу
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Guestbook Stats */}
                        {guestbookStats && (
                            <div
                                className={`mt-4 p-4 rounded-lg border ${
                                    isDark ? 'bg-purple-500/10 border-purple-500/20' : 'bg-purple-500/5 border-purple-500/20'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <CheckCircle size={20} className="text-purple-500 flex-shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="font-bold mb-2">📊 Статистика гостевой книги</p>
                                        <div className="text-sm opacity-80 space-y-2">
                                            <p>
                                                Всего записей: <span className="font-bold text-purple-500">{guestbookStats.total}</span>
                                            </p>

                                            {guestbookStats.total === 0 && (
                                                <div className={`p-3 rounded-lg mt-3 ${isDark ? 'bg-yellow-500/10' : 'bg-yellow-500/5'}`}>
                                                    <p className="flex items-center gap-2">
                                                        <AlertCircle size={16} className="text-yellow-500" />
                                                        Гостевая книга пуста. Записи могут быть восстановлены только из резервной копии.
                                                    </p>
                                                </div>
                                            )}

                                            {guestbookStats.entries && guestbookStats.entries.length > 0 && (
                                                <div className="mt-4 space-y-2">
                                                    <p className="font-bold text-xs uppercase opacity-60">Последние записи:</p>
                                                    {guestbookStats.entries.slice(0, 5).map((entry) => (
                                                        <div
                                                            key={entry.id}
                                                            className={`p-3 rounded-lg text-xs ${
                                                                isDark ? 'bg-white/5' : 'bg-black/5'
                                                            }`}
                                                        >
                                                            <div className="flex justify-between items-start mb-1">
                                                                <span className="font-bold">{entry.author}</span>
                                                                <span className="opacity-50 text-[10px]">
                                                                    {new Date(entry.timestamp).toLocaleString('ru-RU')}
                                                                </span>
                                                            </div>
                                                            <p className="opacity-70">→ {entry.targetUser}</p>
                                                            <p className="mt-2">{entry.text}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Documentation */}
                    <div
                        className={`rounded-xl border p-6 ${
                            isDark ? 'bg-white/5 border-white/10' : 'bg-black/5 border-black/10'
                        }`}
                    >
                        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                            <AlertCircle size={20} />
                            Важная информация
                        </h2>
                        <div className="text-sm opacity-70 space-y-2">
                            <p>
                                • Миграция реакций безопасна и не удаляет данные пользователей
                            </p>
                            <p>
                                • Все пользователи, которые ставили любые реакции, будут учтены в лайках
                            </p>
                            <p>
                                • Счетчики просмотров (views) автоматически проверяются и восстанавливаются
                            </p>
                            <p>
                                • Гостевая книга использует отдельную таблицу и не затрагивается миграцией
                            </p>
                            <p className="pt-2 border-t border-white/10 mt-3">
                                📖 Подробная документация доступна в файле <code className="px-2 py-1 rounded bg-white/10">RESTORE_GUIDE.md</code>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MigrationView;
