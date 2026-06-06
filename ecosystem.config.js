module.exports = {
  apps: [
    {
      name:        'iwacuflix',
      cwd:         '.',                        // root — single combined app
      script:      'node_modules/.bin/next',
      args:        'start -p 4000',
      instances:   1,
      autorestart: true,
      watch:       false,
      max_memory_restart: '600M',
      env_production: {
        NODE_ENV: 'production',
        PORT:     4000,
      },
    },
  ],
};
