/**
 * Loading component - self-contained
 * Uses plain HTML/CSS instead of MUI to ensure it works even if layout fails
 */
export default function Loading() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        backgroundColor: '#f5f5f5',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #1976d2',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }}
      />
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `
      }} />
    </div>
  );
}
