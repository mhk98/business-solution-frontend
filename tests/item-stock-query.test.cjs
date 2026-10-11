const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const root = process.env.FRONTEND_ROOT || path.resolve(__dirname, '..');
const frontendRequire = createRequire(path.join(root, 'package.json'));
const { configureStore } = frontendRequire('@reduxjs/toolkit');
const { createApi } = frontendRequire('@reduxjs/toolkit/query');

async function setup({ hotReload = false, development = true } = {}) {
  const requests = [];
  const baseApi = createApi({
    baseQuery: async (request) => {
      requests.push(request);
      return { data: { data: [], meta: { count: 0 } } };
    },
    tagTypes: ['ItemMaster'],
    endpoints: (build) => hotReload ? {
      getAllItemMaster: build.query({
        query: ({ page, limit, name }) => ({ url: 'item-master', params: { page, limit, name } }),
      }),
    } : {},
  });
  const source = fs.readFileSync(path.join(root, 'src/features/manufactureStock/manufactureStock.jsx'), 'utf8')
    .replace('import { baseApi } from "../baseApi/api";', '')
    .replaceAll('export const ', 'const ')
    .replaceAll('import.meta.env.DEV', String(development));
  vm.runInNewContext(source, { baseApi });
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
  return {
    requests,
    query: (args) => store.dispatch(baseApi.endpoints.getAllItemMaster.initiate(args, { subscribe: false })).unwrap(),
    cleanup: () => store.dispatch(baseApi.util.resetApiState()),
  };
}

for (const options of [{hotReload:true}, {development:false}]) {
  test(`item selection reaches API ${options.hotReload ? 'after hot reload' : 'in production'}`, async () => {
    const client = await setup(options);
    try {
      await client.query({page:1,limit:10,itemIds:'2,7'});
      assert.equal(client.requests.at(-1).params.itemIds, '2,7');
      await client.query({page:1,limit:10,itemIds:'7'});
      assert.equal(client.requests.at(-1).params.itemIds, '7');
      await client.query({page:1,limit:10});
      assert.equal(client.requests.at(-1).params.itemIds, undefined);
      assert.equal(client.requests.length, 3);
    } finally { client.cleanup(); }
  });
}
