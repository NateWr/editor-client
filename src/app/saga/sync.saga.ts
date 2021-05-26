import { all, takeLatest, call, put, takeEvery, select } from 'redux-saga/effects';
import { eventChannel } from 'redux-saga';

import * as manuscriptActions from 'app/actions/manuscript.actions';
import { getLastSyncTimestamp, getManuscriptId } from 'app/selectors/manuscript-editor.selectors';
import { getChangesMadeBetween } from 'app/selectors/manuscript.selectors';
import { setLastSyncFailed, setLastSyncTimestamp } from 'app/actions/manuscript-editor.actions';
import { syncChanges } from 'app/api/manuscript.api';
import { Change } from 'app/utils/history/change';
import { ConfigState } from 'app/store';
import { getConfigState } from 'app/selectors/config.selectors';

const SYNC_INTERVAL = 2000;

function createPollingEventChannel(delay: number) {
  return eventChannel((emitter) => {
    const interval = setInterval(() => {
      emitter(0);
    }, delay);

    return () => clearInterval(interval);
  });
}

export function* watchChangesSaga() {
  const channel = yield call(createPollingEventChannel, SYNC_INTERVAL);
  const configState: ConfigState = yield select(getConfigState);
  yield takeEvery(channel, function* () {
    const now = Date.now();
    const lastSyncTimeStamp = yield select(getLastSyncTimestamp);
    const changesSelector = yield select(getChangesMadeBetween);
    const changes: Change[] = changesSelector(lastSyncTimeStamp, now);
    if (changes.length > 0) {
      const requestConfig = configState.csrfToken
        ? { headers: { 'X-Csrf-Token': configState.csrfToken }}
        : {};
      try {
        yield call(syncChanges, configState.changesUrl, changes, requestConfig);
        yield put(setLastSyncTimestamp(now));
      } catch (e) {
        yield put(setLastSyncFailed());
      }
    }
  });
}

export default function* () {
  yield all([takeLatest(manuscriptActions.loadManuscriptAction.success, watchChangesSaga)]);
}
