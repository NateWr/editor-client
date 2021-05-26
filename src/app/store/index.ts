import { combineReducers, createStore, applyMiddleware } from 'redux';
import createSagaMiddleware from 'redux-saga';
import { composeWithDevTools } from 'redux-devtools-extension';
import { rootSaga } from 'app/saga';
import { manuscriptReducer } from 'app/reducers/manuscript.reducer';
import { LoadableState, ManuscriptHistory } from 'app/utils/state.utils';
import { manuscriptEditorReducer } from 'app/reducers/manuscript-editor.reducer';
import { connectRouter, routerMiddleware } from 'connected-react-router';
import { history } from './history';
import { ModalPayload } from 'app/actions/manuscript-editor.actions';
import { TableOfContents } from 'app/types/manuscript';

const sagaMiddleware = createSagaMiddleware();

export type ManuscriptHistoryState = LoadableState<ManuscriptHistory>;

export interface ManuscriptEditorState {
  focusedManuscriptPath: string | undefined;
  manuscriptBodyTOC: TableOfContents;
  lastSyncTimestamp: number;
  lastSyncSuccessful: boolean;
  manuscriptId: string;
  modal: {
    params?: ModalPayload;
    isVisible: boolean;
  };
}

export interface ConfigState {
  manuscriptUrl: string;
  figureUploadUrl: string;
  changesUrl: string;
  id: string;
  csrfToken: string;
  returnUrl: string;
  toc: Array<any>;
  enabledEditorParts: Array<string>;
}

export interface ApplicationState {
  config: ConfigState;
  manuscript: ManuscriptHistoryState;
  manuscriptEditor: ManuscriptEditorState;
}

declare var LIBERO_CONFIG: any;

export const store = createStore(
  combineReducers({
    router: connectRouter(history),
    config: () => LIBERO_CONFIG ?? {},
    manuscript: manuscriptReducer,
    manuscriptEditor: manuscriptEditorReducer
  }),
  composeWithDevTools(applyMiddleware(routerMiddleware(history), sagaMiddleware))
);

sagaMiddleware.run(rootSaga);
