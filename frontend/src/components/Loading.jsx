import React from "react";

export default function Loading() {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "#121212",
      color: "#fff",
      fontFamily: "'Roboto', sans-serif",
    }}>
      <p>Loading...</p>
    </div>
  );
}