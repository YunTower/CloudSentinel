import { createAlova } from 'alova';
import adapterFetch from 'alova/fetch';

export const requester = createAlova({
  requestAdapter: adapterFetch(),
  responded: response => response.json()
});
