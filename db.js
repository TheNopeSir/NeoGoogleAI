/**
 * PostgreSQL Database Connection
 * Подключение к PostgreSQL без Supabase
 */

import pg from 'pg';
const { Pool } = pg;

// Создаем пул подключений
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // Всегда принимаем self-signed сертификаты для NeoBD
  ssl: { rejectUnauthorized: false },
  max: 20, // Максимум 20 одновременных подключений
  idleTimeoutMillis: 30000, // Закрывать idle подключения через 30 сек
  connectionTimeoutMillis: 2000, // Таймаут подключения 2 сек
});

// Логирование подключения
pool.on('connect', (client) => {
  console.log('✅ PostgreSQL connection established');
});

pool.on('error', (err, client) => {
  console.error('❌ Unexpected PostgreSQL error:', err);
  process.exit(-1);
});

// Тестируем подключение при старте
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ PostgreSQL connection test failed:', err.message);
    console.error('💡 Check your DATABASE_URL environment variable');
    process.exit(1);
  } else {
    console.log(`🗄️  PostgreSQL connected at ${res.rows[0].now}`);
  }
});

// Вспомогательные функции для работы с данными

/**
 * Получить все записи из таблицы
 */
export async function getAll(tableName, orderBy = 'timestamp', order = 'DESC') {
  const query = `SELECT data FROM ${tableName} ORDER BY ${orderBy} ${order}`;
  const result = await pool.query(query);
  return result.rows.map(row => row.data);
}

/**
 * Получить одну запись по ID
 */
export async function getById(tableName, id, keyField = 'id') {
  const query = `SELECT data FROM ${tableName} WHERE ${keyField} = $1`;
  const result = await pool.query(query, [id]);
  return result.rows[0]?.data || null;
}

/**
 * Создать или обновить запись
 */
export async function upsert(tableName, data, keyField = 'id') {
  const key = data[keyField];
  const timestamp = new Date().toISOString();

  if (tableName === 'users') {
    // Для users используем username
    const query = `
      INSERT INTO users (username, data, created_at, updated_at)
      VALUES ($1, $2, NOW(), NOW())
      ON CONFLICT (username)
      DO UPDATE SET data = $2, updated_at = NOW()
    `;
    await pool.query(query, [key, data]);
  } else {
    // Для остальных таблиц
    const query = `
      INSERT INTO ${tableName} (id, data, timestamp, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (id)
      DO UPDATE SET data = $2, timestamp = $3
    `;
    await pool.query(query, [key, data, timestamp]);
  }

  return { success: true };
}

/**
 * Удалить запись
 */
export async function deleteRecord(tableName, id, keyField = 'id') {
  const query = `DELETE FROM ${tableName} WHERE ${keyField} = $1`;
  await pool.query(query, [id]);
  return { success: true };
}

/**
 * Получить записи с фильтром
 */
export async function getFiltered(tableName, whereClause, params = []) {
  const query = `SELECT data FROM ${tableName} WHERE ${whereClause}`;
  const result = await pool.query(query, params);
  return result.rows.map(row => row.data);
}

/**
 * Выполнить произвольный SQL запрос
 */
export async function query(sql, params = []) {
  return await pool.query(sql, params);
}

// Экспортируем пул для прямого доступа
export default pool;
