// Desktop build only (swapped in for @/api/base44Client): the same client surface the pages use,
// answered by the desktop app's local backend on this PC instead of Base44.
const OPS = ['list', 'filter', 'get', 'create', 'bulkCreate', 'update', 'bulkUpdate', 'delete', 'deleteMany', 'updateMany', 'count', 'aggregate'];

async function call(kind, ...args) {
  try {
    return await window.quantbotLocal.invoke(kind, ...args);
  } catch (e) {
    // Same error shape the pages read from the hosted SDK (e.response.data.error)
    const message = String(e?.message || e).replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
    const err = new Error(message);
    err.response = { data: { error: message } };
    throw err;
  }
}

const entity = (name) => ({
  ...Object.fromEntries(OPS.map((op) => [op, (...args) => call('entity', name, op, ...args)])),
  subscribe: () => () => {},
});

const upload = async ({ file }) => call('file', file.name, new Uint8Array(await file.arrayBuffer()));

export const base44 = {
  entities: new Proxy({}, { get: (_t, name) => entity(String(name)) }),
  auth: {
    me: () => call('user', 'me'),
    updateMe: (data) => call('user', 'update', data),
    isAuthenticated: async () => true,
    logout: () => window.location.assign('/'),
    redirectToLogin: () => window.location.assign('/'),
  },
  functions: {
    invoke: async (name, payload) => ({ data: await call('function', name, payload) }),
  },
  integrations: {
    Core: {
      UploadPrivateFile: upload,
      UploadPublicFile: upload,
      UploadFile: upload,
      CreateFileSignedUrl: async ({ file_uri }) => ({ signed_url: `app://quantbot/files/${encodeURIComponent(String(file_uri).split('/').pop())}` }),
    },
  },
  analytics: { track: () => {} },
  app: { getPublicSettings: async () => ({}) },
};

export default base44;