require('dotenv').config();

module.exports = {
    apps: [{
        name: 'neoarchive',
        script: 'server.js',
        interpreter: 'node',
        instances: 1,
        autorestart: true,
        watch: false,
        max_memory_restart: '512M',
        env_production: {
            NODE_ENV: 'production',
            PORT: process.env.PORT || 3002,
        },
    }],
};
