import React, { useState } from 'react';
import { Upload, Database, Image, RefreshCw, Trash2, Download, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface AdminToolsProps {
  onClose: () => void;
}

interface Stats {
  totalExhibits: number;
  withImages: number;
  withBase64: number;
  withOptimized: number;
  withBroken: number;
}

interface MigrationLog {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

const AdminTools: React.FC<AdminToolsProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'migrate' | 'backup' | 'cleanup'>('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<MigrationLog[]>([]);
  const [sqlFile, setSqlFile] = useState<File | null>(null);

  const addLog = (message: string, type: MigrationLog['type'] = 'info') => {
    setLogs(prev => [...prev, { timestamp: new Date().toLocaleTimeString(), message, type }]);
  };

  // Получить статистику изображений
  const fetchStats = async () => {
    setLoading(true);
    addLog('Загрузка статистики...', 'info');

    try {
      const response = await fetch('/api/admin/image-stats');
      const data = await response.json();
      setStats(data);
      addLog(`Статистика загружена: ${data.totalExhibits} артефактов`, 'success');
    } catch (error) {
      addLog('Ошибка загрузки статистики: ' + error, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка SQL файла
  const handleSqlUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSqlFile(file);
    addLog(`SQL файл выбран: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`, 'info');
  };

  // Импорт SQL
  const importSQL = async () => {
    if (!sqlFile) {
      addLog('Сначала выберите SQL файл', 'warning');
      return;
    }

    setLoading(true);
    addLog('Начало импорта SQL дампа...', 'info');

    try {
      const formData = new FormData();
      formData.append('sqlFile', sqlFile);

      const response = await fetch('/api/admin/import-sql', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        addLog(`SQL импортирован успешно! Обработано ${result.processed} записей`, 'success');
        await fetchStats();
      } else {
        addLog('Ошибка импорта: ' + result.error, 'error');
      }
    } catch (error) {
      addLog('Ошибка импорта SQL: ' + error, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Миграция изображений
  const migrateImages = async () => {
    setLoading(true);
    addLog('Начало миграции base64 → WebP...', 'info');

    try {
      const response = await fetch('/api/admin/migrate-images', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        addLog(`Миграция завершена! Обработано: ${result.migrated} артефактов`, 'success');
        addLog(`Создано файлов: ${result.filesCreated}`, 'info');
        await fetchStats();
      } else {
        addLog('Ошибка миграции: ' + result.error, 'error');
      }
    } catch (error) {
      addLog('Ошибка миграции: ' + error, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Очистка битых путей
  const cleanupBrokenPaths = async () => {
    if (!confirm('Удалить пути к несуществующим файлам? Это действие нельзя отменить.')) {
      return;
    }

    setLoading(true);
    addLog('Очистка битых путей...', 'info');

    try {
      const response = await fetch('/api/admin/cleanup-broken', {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        addLog(`Очищено: ${result.cleaned} артефактов`, 'success');
        await fetchStats();
      } else {
        addLog('Ошибка очистки: ' + result.error, 'error');
      }
    } catch (error) {
      addLog('Ошибка очистки: ' + error, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Создать бэкап
  const createBackup = async () => {
    setLoading(true);
    addLog('Создание резервной копии...', 'info');

    try {
      const response = await fetch('/api/admin/create-backup', {
        method: 'POST'
      });

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${Date.now()}.json`;
      a.click();

      addLog('Резервная копия создана и скачана', 'success');
    } catch (error) {
      addLog('Ошибка создания бэкапа: ' + error, 'error');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStats();
  }, []);

  const getLogIcon = (type: MigrationLog['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="text-green-500" size={16} />;
      case 'error': return <AlertCircle className="text-red-500" size={16} />;
      case 'warning': return <AlertCircle className="text-yellow-500" size={16} />;
      default: return <RefreshCw className="text-blue-500" size={16} />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-dark-surface border border-green-500/30 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden shadow-2xl shadow-green-500/20">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border-b border-green-500/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-green-400 flex items-center gap-2">
                <Database size={28} />
                Панель администратора
              </h2>
              <p className="text-sm text-white/60 mt-1">Управление изображениями и базой данных</p>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 transition-colors"
            >
              Закрыть
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            {[
              { id: 'overview', label: 'Обзор', icon: Database },
              { id: 'migrate', label: 'Миграция', icon: RefreshCw },
              { id: 'backup', label: 'Резервные копии', icon: Download },
              { id: 'cleanup', label: 'Очистка', icon: Trash2 }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  activeTab === tab.id
                    ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex h-[calc(90vh-200px)]">
          {/* Main Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {/* Overview Tab */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <StatCard label="Всего артефактов" value={stats.totalExhibits} color="blue" />
                  <StatCard label="С изображениями" value={stats.withImages} color="green" />
                  <StatCard label="Base64 (нужна миграция)" value={stats.withBase64} color="yellow" />
                  <StatCard label="Оптимизированные" value={stats.withOptimized} color="green" />
                  <StatCard label="Битые пути" value={stats.withBroken} color="red" />
                </div>

                {stats.withBase64 > 0 && (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-yellow-500 mt-1" size={20} />
                      <div>
                        <h3 className="text-yellow-400 font-bold">Требуется миграция</h3>
                        <p className="text-white/70 text-sm mt-1">
                          Найдено {stats.withBase64} артефактов с base64 изображениями.
                          Рекомендуется выполнить миграцию для оптимизации.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {stats.withBroken > 0 && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="text-red-500 mt-1" size={20} />
                      <div>
                        <h3 className="text-red-400 font-bold">Битые пути к изображениям</h3>
                        <p className="text-white/70 text-sm mt-1">
                          Найдено {stats.withBroken} артефактов с несуществующими файлами.
                          Используйте очистку для удаления битых путей.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Migrate Tab */}
            {activeTab === 'migrate' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                    <Upload size={20} />
                    Импорт SQL дампа
                  </h3>
                  <p className="text-white/70 text-sm mb-4">
                    Загрузите SQL дамп базы данных для восстановления артефактов с изображениями
                  </p>
                  <div className="flex gap-3">
                    <input
                      type="file"
                      accept=".sql"
                      onChange={handleSqlUpload}
                      className="hidden"
                      id="sql-upload"
                    />
                    <label
                      htmlFor="sql-upload"
                      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-blue-400 cursor-pointer transition-colors flex items-center gap-2"
                    >
                      <Upload size={16} />
                      Выбрать SQL файл
                    </label>
                    {sqlFile && (
                      <button
                        onClick={importSQL}
                        disabled={loading}
                        className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-400 disabled:opacity-50 transition-colors flex items-center gap-2"
                      >
                        {loading ? <Loader size={16} className="animate-spin" /> : <Database size={16} />}
                        Импортировать
                      </button>
                    )}
                  </div>
                  {sqlFile && (
                    <div className="mt-3 text-sm text-white/60">
                      Выбран файл: <span className="text-green-400">{sqlFile.name}</span>
                    </div>
                  )}
                </div>

                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                    <Image size={20} />
                    Миграция изображений
                  </h3>
                  <p className="text-white/70 text-sm mb-4">
                    Конвертировать base64 изображения в оптимизированные WebP файлы (4 размера: thumbnail, medium, large, placeholder)
                  </p>
                  <button
                    onClick={migrateImages}
                    disabled={loading || stats?.withBase64 === 0}
                    className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg text-green-400 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {loading ? <Loader size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                    Запустить миграцию
                  </button>
                </div>
              </div>
            )}

            {/* Backup Tab */}
            {activeTab === 'backup' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">
                    <Download size={20} />
                    Создать резервную копию
                  </h3>
                  <p className="text-white/70 text-sm mb-4">
                    Создать JSON бэкап всех артефактов из базы данных
                  </p>
                  <button
                    onClick={createBackup}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg text-blue-400 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {loading ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                    Скачать бэкап
                  </button>
                </div>
              </div>
            )}

            {/* Cleanup Tab */}
            {activeTab === 'cleanup' && (
              <div className="space-y-6">
                <div className="bg-white/5 border border-white/10 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-red-400 mb-4 flex items-center gap-2">
                    <Trash2 size={20} />
                    Очистка битых путей
                  </h3>
                  <p className="text-white/70 text-sm mb-4">
                    Удалить пути к несуществующим изображениям. Пользователи смогут загрузить изображения заново.
                  </p>
                  <button
                    onClick={cleanupBrokenPaths}
                    disabled={loading || stats?.withBroken === 0}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {loading ? <Loader size={16} className="animate-spin" /> : <Trash2 size={16} />}
                    Очистить ({stats?.withBroken || 0})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logs Panel */}
          <div className="w-96 border-l border-white/10 bg-black/40 p-4 overflow-y-auto">
            <h3 className="text-sm font-bold text-white/80 mb-3 flex items-center justify-between">
              <span>Логи операций</span>
              <button
                onClick={() => setLogs([])}
                className="text-xs text-white/40 hover:text-white/60"
              >
                Очистить
              </button>
            </h3>
            <div className="space-y-2">
              {logs.length === 0 ? (
                <div className="text-white/40 text-xs text-center py-8">
                  Логи появятся здесь
                </div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="bg-white/5 rounded p-2 text-xs">
                    <div className="flex items-start gap-2">
                      {getLogIcon(log.type)}
                      <div className="flex-1">
                        <div className="text-white/40">{log.timestamp}</div>
                        <div className="text-white/80 mt-1">{log.message}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface StatCardProps {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'yellow' | 'red';
}

const StatCard: React.FC<StatCardProps> = ({ label, value, color }) => {
  const colors = {
    blue: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
    green: 'border-green-500/30 bg-green-500/10 text-green-400',
    yellow: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400',
    red: 'border-red-500/30 bg-red-500/10 text-red-400'
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-xs text-white/60 mt-1">{label}</div>
    </div>
  );
};

export default AdminTools;
