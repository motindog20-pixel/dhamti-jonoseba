function express() {
  const layers = [];
  const app = {
    layers,
    set() {}, disable() {},
    use(...a) { let path = '/'; if (typeof a[0] === 'string') path = a.shift(); for (const fn of a) layers.push({ type: 'use', path, fn }); },
  };
  for (const m of ['get', 'post', 'put', 'patch', 'delete'])
    app[m] = (path, ...fns) => { for (const fn of fns) layers.push({ type: 'route', method: m.toUpperCase(), path, fn }); };
  return app;
}
express.json = () => (req, res, next) => next();
export default express;
