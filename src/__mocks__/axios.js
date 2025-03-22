const mockAxios = {
  create: jest.fn(() => mockAxios),
  post: jest.fn(() => Promise.resolve({ data: { token: 'mock-token' } })),
  get: jest.fn(() => Promise.resolve({ data: [] })),
};

//export default mockAxios;

