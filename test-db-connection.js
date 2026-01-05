/**
 * Test PostgreSQL Connection and Data
 */
import { readFileSync } from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

// Load .env manually
const envFile = readFileSync('.env', 'utf-8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    const key = match[1].trim();
    const value = match[2].trim();
    process.env[key] = value;
  }
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  console.log('🔌 Тестируем подключение к PostgreSQL...\n');

  try {
    // Test connection
    const client = await pool.connect();
    console.log('✅ Подключение установлено!\n');

    // Get table counts
    const tables = ['users', 'exhibits', 'collections', 'notifications', 'messages', 'guestbook'];

    console.log('📊 Статистика данных:');
    console.log('═'.repeat(40));

    for (const table of tables) {
      const result = await client.query(`SELECT COUNT(*) FROM ${table}`);
      const count = result.rows[0].count;
      console.log(`   ${table.padEnd(20)} ${count} записей`);
    }

    console.log('═'.repeat(40));

    // Sample data from users table
    const usersResult = await client.query('SELECT id, data FROM users LIMIT 3');
    console.log('\n👥 Примеры данных (users):');
    usersResult.rows.forEach((row, i) => {
      const username = row.data?.username || row.data?.email || 'Unknown';
      console.log(`   ${i + 1}. ID: ${row.id}, Username: ${username}`);
    });

    client.release();
    console.log('\n✅ Тест завершен успешно!');

  } catch (error) {
    console.error('❌ Ошибка подключения:', error.message);
    if (error.message.includes('password')) {
      console.log('\n💡 Подсказка: Проверьте DATABASE_URL в .env файле');
      console.log('   Убедитесь, что заменили PASSWORD на реальный пароль');
    }
  } finally {
    await pool.end();
  }
}

testConnection();
