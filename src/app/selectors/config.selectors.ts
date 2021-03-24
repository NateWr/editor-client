import { ApplicationState, ConfigState } from 'app/store';

export const getConfigState = (state: ApplicationState): ConfigState => {
  return state.config;
};
