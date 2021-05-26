import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';
import { App } from './app/app';

declare var pkp: any;

// pkp.ReactDOM = ReactDOM;
// pkp.ReactApp = <React.StrictMode>
//     <App />
//   </React.StrictMode>;

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
