// Override Next.js internal error page with getInitialProps.
// Prevents static generation that triggers the <Html> error in Next.js 15.5.20.
// pages/_error.js is the ONLY page file allowed to use getInitialProps.

function ErrorPage({ statusCode }) {
  // Minimal fallback — App Router's error.tsx handles actual rendering
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div>
        <h1 style={{ fontSize: "2rem", fontWeight: 700, margin: 0 }}>
          {statusCode ? `Error ${statusCode}` : "An error occurred"}
        </h1>
        <p style={{ marginTop: "0.5rem", color: "#666" }}>
          Please try again later.
        </p>
      </div>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default ErrorPage;
