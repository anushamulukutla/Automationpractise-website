'use strict';
// OpenAPI 3 description, served at /openapi.json and rendered by Swagger UI at /docs.

const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const json = (schema) => ({ 'application/json': { schema } });
const err = (description) => ({ description, content: json(ref('Error')) });
const idParam = { name: 'id', in: 'path', required: true, schema: { type: 'integer' } };
const secured = [{ bearerAuth: [] }];

const listParams = (extra = []) => [
  { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 10 } },
  { name: 'sort', in: 'query', description: 'Field name to sort by', schema: { type: 'string' } },
  { name: 'order', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'asc' } },
  { name: 'q', in: 'query', description: 'Case-insensitive text search', schema: { type: 'string' } },
  ...extra.map((e) => ({ name: e.name, in: 'query', description: e.description, schema: e.schema || { type: 'string' } })),
];

function crud(tag, plural, schema, inputSchema, { listFilters = [], publicRead = false, adminDelete = false } = {}) {
  const sec = publicRead ? undefined : secured;
  const write = secured;
  return {
    [`/api/${plural}`]: {
      get: {
        tags: [tag], summary: `List ${plural}`, security: sec, parameters: listParams(listFilters),
        responses: { 200: { description: 'A page of results', content: json({ type: 'object', properties: { data: { type: 'array', items: ref(schema) }, page: { type: 'integer' }, limit: { type: 'integer' }, total: { type: 'integer' }, totalPages: { type: 'integer' } } }) }, 400: err('Bad query parameter'), ...(publicRead ? {} : { 401: err('Missing, invalid or expired token') }) },
      },
      post: {
        tags: [tag], summary: `Create a ${plural.slice(0, -1)}`, security: write, requestBody: { required: true, content: json(ref(inputSchema)) },
        responses: { 201: { description: 'Created', content: json(ref(schema)) }, 400: err('Validation failed'), 401: err('Unauthorized'), ...(plural === 'users' ? { 409: err('Duplicate username or email') } : {}) },
      },
    },
    [`/api/${plural}/{id}`]: {
      get: { tags: [tag], summary: `Get one ${plural.slice(0, -1)}`, security: sec, parameters: [idParam], responses: { 200: { description: 'Found', content: json(ref(schema)) }, 404: err('Not found'), ...(publicRead ? {} : { 401: err('Unauthorized') }) } },
      put: { tags: [tag], summary: 'Replace (all required fields must be sent)', security: write, parameters: [idParam], requestBody: { required: true, content: json(ref(inputSchema)) }, responses: { 200: { description: 'Replaced', content: json(ref(schema)) }, 400: err('Validation failed'), 401: err('Unauthorized'), 404: err('Not found') } },
      patch: { tags: [tag], summary: 'Update only the fields you send', security: write, parameters: [idParam], requestBody: { required: true, content: json(ref(inputSchema)) }, responses: { 200: { description: 'Updated', content: json(ref(schema)) }, 400: err('Validation failed'), 401: err('Unauthorized'), 404: err('Not found') } },
      delete: { tags: [tag], summary: adminDelete ? 'Delete (admin only)' : 'Delete', security: write, parameters: [idParam], responses: { 204: { description: 'Deleted' }, 401: err('Unauthorized'), ...(adminDelete ? { 403: err('Admin role required') } : {}), 404: err('Not found') } },
    },
  };
}

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'QA Practice App API',
    version: '1.0.0',
    description: 'REST API for API / Postman / pytest practice.\n\n1. `POST /api/auth/login` with `admin` / `Admin@123` (or `standard` / `User@123`).\n2. Click **Authorize** and paste the token.\n3. Call the endpoints. `POST /api/reset` restores the default data.',
  },
  servers: [{ url: '/' }],
  tags: [
    { name: 'Auth' }, { name: 'Users' }, { name: 'Products' }, { name: 'Orders' },
    { name: 'Resilience', description: 'Delays and random failures for timeout and retry practice' },
    { name: 'Utility' },
  ],
  paths: {
    '/health': { get: { tags: ['Utility'], summary: 'Health check', responses: { 200: { description: 'Service is up', content: json({ type: 'object', properties: { status: { type: 'string', example: 'ok' }, uptime: { type: 'integer' }, timestamp: { type: 'string' } } }) } } } },
    '/api/reset': { post: { tags: ['Utility'], summary: 'Restore the default dataset', parameters: [{ name: 'keepSettings', in: 'query', schema: { type: 'boolean' } }], responses: { 200: { description: 'Reset done' } } } },
    '/api/settings': {
      get: { tags: ['Utility'], summary: 'Read global QA toggles', responses: { 200: { description: 'Current settings' } } },
      put: { tags: ['Utility'], summary: 'Update global QA toggles', requestBody: { content: json({ type: 'object', properties: { slowNetwork: { type: 'boolean' }, slowNetworkMs: { type: 'integer' }, flakyMode: { type: 'boolean' }, flakyRate: { type: 'number' }, randomizeIds: { type: 'boolean' } } }) }, responses: { 200: { description: 'Updated settings' }, 400: err('Invalid value') } },
    },
    '/api/auth/login': {
      post: {
        tags: ['Auth'], summary: 'Log in and receive a JWT',
        requestBody: { required: true, content: json({ type: 'object', required: ['username', 'password'], properties: { username: { type: 'string', example: 'admin' }, password: { type: 'string', example: 'Admin@123' }, expiresIn: { type: 'integer', description: 'Token lifetime in seconds (1 to 86400, default 3600)' } } }) },
        responses: { 200: { description: 'Logged in', content: json({ type: 'object', properties: { token: { type: 'string' }, tokenType: { type: 'string' }, expiresIn: { type: 'integer' }, user: ref('User') } }) }, 400: err('Missing fields'), 401: err('Invalid credentials'), 403: err('Account inactive or password expired'), 423: err('Account locked') },
      },
    },
    '/api/auth/me': { get: { tags: ['Auth'], summary: 'Current user', security: secured, responses: { 200: { description: 'The logged-in user' }, 401: err('Missing, invalid or expired token') } } },
    ...crud('Users', 'users', 'User', 'UserInput', { listFilters: [{ name: 'role', description: 'admin or user' }, { name: 'status', description: 'active, locked, inactive or expired-password' }], adminDelete: true }),
    ...crud('Products', 'products', 'Product', 'ProductInput', { listFilters: [{ name: 'category' }, { name: 'minPrice', schema: { type: 'number' } }, { name: 'maxPrice', schema: { type: 'number' } }], publicRead: true }),
    ...crud('Orders', 'orders', 'Order', 'OrderInput', { listFilters: [{ name: 'status', description: 'pending, paid, shipped or cancelled' }, { name: 'userId', schema: { type: 'integer' } }] }),
    '/slow': { get: { tags: ['Resilience'], summary: 'Respond after a delay', parameters: [{ name: 'ms', in: 'query', schema: { type: 'integer', default: 3000, maximum: 30000 } }], responses: { 200: { description: 'Delayed response' }, 400: err('Invalid ms') } } },
    '/flaky': { get: { tags: ['Resilience'], summary: 'Randomly fails with 500', parameters: [{ name: 'rate', in: 'query', schema: { type: 'number', default: 0.5, minimum: 0, maximum: 1 } }], responses: { 200: { description: 'Succeeded' }, 500: err('Random failure') } } },
    '/status/{code}': { get: { tags: ['Resilience'], summary: 'Respond with the given HTTP status', parameters: [{ name: 'code', in: 'path', required: true, schema: { type: 'integer', minimum: 200, maximum: 599 } }], responses: { default: { description: 'The requested status' } } } },
  },
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
    schemas: {
      Error: { type: 'object', properties: { error: { type: 'string' }, code: { type: 'string' }, details: { type: 'array', items: { type: 'string' } } } },
      User: { type: 'object', properties: { id: { type: 'integer' }, username: { type: 'string' }, email: { type: 'string' }, firstName: { type: 'string' }, lastName: { type: 'string' }, role: { type: 'string', enum: ['admin', 'user'] }, status: { type: 'string', enum: ['active', 'locked', 'inactive', 'expired-password'] }, phone: { type: 'string' } } },
      UserInput: { type: 'object', required: ['username', 'email'], properties: { username: { type: 'string', minLength: 3 }, email: { type: 'string', format: 'email' }, password: { type: 'string', minLength: 6 }, firstName: { type: 'string' }, lastName: { type: 'string' }, role: { type: 'string', enum: ['admin', 'user'] }, status: { type: 'string' }, phone: { type: 'string' } } },
      Product: { type: 'object', properties: { id: { type: 'integer' }, name: { type: 'string' }, category: { type: 'string' }, price: { type: 'number' }, stock: { type: 'integer' }, sku: { type: 'string' } } },
      ProductInput: { type: 'object', required: ['name', 'price'], properties: { name: { type: 'string' }, category: { type: 'string' }, price: { type: 'number', minimum: 0 }, stock: { type: 'integer', minimum: 0 }, sku: { type: 'string' } } },
      Order: { type: 'object', properties: { id: { type: 'integer' }, userId: { type: 'integer' }, items: { type: 'array', items: { type: 'object', properties: { productId: { type: 'integer' }, quantity: { type: 'integer' }, price: { type: 'number' } } } }, total: { type: 'number' }, status: { type: 'string', enum: ['pending', 'paid', 'shipped', 'cancelled'] } } },
      OrderInput: { type: 'object', required: ['userId', 'items'], properties: { userId: { type: 'integer' }, items: { type: 'array', items: { type: 'object', required: ['productId', 'quantity'], properties: { productId: { type: 'integer' }, quantity: { type: 'integer', minimum: 1 } } } }, status: { type: 'string', enum: ['pending', 'paid', 'shipped', 'cancelled'] } } },
    },
  },
};
