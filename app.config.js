module.exports = ({ config }) =>
  process.env.TOURGUIDE_WEB_SERVER === '1' ? { ...config, web: { ...config.web, output: 'server' } } : config;
