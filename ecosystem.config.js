module.exports = {
  apps: [
    {
      name: "fastpik",
      script: "server.js",
      cwd: "/var/www/fastpik/current",
      env: {
        PORT: 3000,
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
      },
      max_memory_restart: "1G",
      autorestart: true,
      restart_delay: 3000,
    },
  ],
};
