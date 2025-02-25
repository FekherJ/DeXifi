import React from "react";
import ReactDOM from "react-dom/client"; // Use createRoot from ReactDOM
import Dashboard from "./components/dashboard/Dashboard";

// Find the mount point in the DOM
const rootElement = document.getElementById("react-dashboard");

// Create the root and render the component
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement); // Create root for React 18
  root.render(
    <React.StrictMode>
      <Dashboard />
    </React.StrictMode>
  );
} else {
  console.error("React mount point not found!");
}
