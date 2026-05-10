module.exports = {
  apps : [{
    name: "Flipthru",
    script: "pnpm start",
    env: {
      NODE_ENV: "production",
    },
    exp_backoff_restart_delay: 100,
    max_memory_restart: "1G"
  }]
};
