export const openApiSpec = {
  openapi: '3.0.1',
  info: {
    title: 'SimOEM API',
    version: '1.0.0',
  },
  servers: [{ url: 'http://localhost:3333' }],
  paths: {
    '/api/sim/config': {
      get: {
        operationId: 'getSimConfig',
        responses: {
          '200': { description: 'Sim config' },
        },
      },
    },
    '/api/sim/new': {
      post: {
        operationId: 'startNewSim',
        responses: { '200': { description: 'New sim started' } },
      },
    },
    '/api/sim/tick': {
      post: {
        operationId: 'advanceTick',
        responses: { '200': { description: 'Sim snapshot' } },
      },
    },
    '/api/sim/state': {
      get: {
        operationId: 'getActiveState',
        responses: { '200': { description: 'State summary' } },
      },
    },
    '/api/sim/history': {
      get: {
        operationId: 'getHistory',
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'integer' } },
          { name: 'to', in: 'query', schema: { type: 'integer' } },
        ],
        responses: { '200': { description: 'Snapshots window' } },
      },
    },
    '/api/actions/plan': {
      post: {
        operationId: 'planActions',
        responses: { '200': { description: 'Plan accepted' } },
      },
    },
    '/api/save': {
      post: {
        operationId: 'saveGame',
        responses: { '200': { description: 'Saved' } },
      },
      get: {
        operationId: 'listSaves',
        responses: { '200': { description: 'List saves' } },
      },
    },
    '/api/load': {
      post: {
        operationId: 'loadGame',
        responses: { '200': { description: 'Loaded' } },
      },
    },
  },
};
