import { configureStore } from '@reduxjs/toolkit';
import createSagaMiddleware from 'redux-saga';
import { all } from 'redux-saga/effects';
import mapDistanceReducer from '../features/mapDistance/mapDistanceSlice';
import { mapDistanceSaga } from '../features/mapDistance/mapDistanceSaga';

const sagaMiddleware = createSagaMiddleware();

export const store = configureStore({
  reducer: {
    mapDistance: mapDistanceReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ thunk: false }).concat(sagaMiddleware),
});

/** 根 Saga：汇总所有模块 Saga */
function* rootSaga() {
  yield all([mapDistanceSaga()]);
}

sagaMiddleware.run(rootSaga);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;