import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import {App} from './router';
import { ErrorBoundary } from './components/ErrorBoundary';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </BrowserRouter>
  </React.StrictMode >
);


// import React from "react";
// import { createRoot } from "react-dom/client";
// import App from "./App";

// createRoot(document.getElementById("root")!).render(
//   <ErrorBoundary>
//     <App />
//   </ErrorBoundary>
// );
