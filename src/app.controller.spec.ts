import { AppController } from './app.controller.js';

describe('AppController', () => {
  it('names the API', () => {
    expect(new AppController().root()).toEqual({ name: 'TheraTax' });
  });
});
