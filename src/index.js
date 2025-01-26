import React from "react";
import ReactDOM from "react-dom";
import Dashboard from "./components/Dashboard";

// Render the Dashboard component
ReactDOM.render(
  <React.StrictMode>
    <Dashboard />
  </React.StrictMode>,
  document.getElementById("react-dashboard") // Correct mount point
);
