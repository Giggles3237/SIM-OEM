import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3333',
});

export async function fetchConfig() {
  const { data } = await api.get('/api/sim/config');
  return data;
}

export async function startNewSim() {
  const { data } = await api.post('/api/sim/new');
  return data;
}

export async function fetchState() {
  const { data } = await api.get('/api/sim/state');
  return data;
}

export async function submitPlan(plan: any) {
  const { data } = await api.post('/api/actions/plan', plan);
  return data;
}

export async function tickSim() {
  const { data } = await api.post('/api/sim/tick');
  return data;
}

export async function fetchHistory() {
  const { data } = await api.get('/api/sim/history');
  return data;
}
