import { all, takeLatest, call, put, select } from 'redux-saga/effects';

import * as manuscriptActions from 'app/actions/manuscript.actions';
import * as manuscriptEditorActions from 'app/actions/manuscript-editor.actions';
import { Action } from 'app/utils/action.utils';
import { getManuscriptChanges, getManuscriptContent } from 'app/api/manuscript.api';
import { applyChangesFromServer } from 'app/utils/changes.utils';
import { ConfigState } from 'app/store';
import { getConfigState } from 'app/selectors/config.selectors';

/**
 * Side effect handler to load the specified article from the backend.
 *
 * @export
 * @param {Action<string>} action
 */
export function* loadManuscriptSaga(action: Action<string>) {
  const id = action.payload;
  const configState: ConfigState = yield select(getConfigState);
  try {
    let manuscript = yield call(getManuscriptContent, configState.manuscriptUrl, configState.id);
    try {
      const changesJson = yield call(getManuscriptChanges, configState.changesUrl);
      manuscript = applyChangesFromServer(manuscript, changesJson);
    } catch (e) {
      console.error('Loading changes failed', e);
    }

    yield put(manuscriptActions.loadManuscriptAction.success(manuscript));
    yield put(manuscriptEditorActions.setManuscriptId(id));
  } catch (e) {
    console.error(e);
    yield put(manuscriptActions.loadManuscriptAction.error(e));
  }
}

export default function* () {
  yield all([takeLatest(manuscriptActions.loadManuscriptAction.request, loadManuscriptSaga)]);
}
