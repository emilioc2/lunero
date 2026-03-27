export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.02em' }}>lunero</span>
        <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.55 }}>A calmer way to budget.</p>
      </div>
      {children}
    </div>
  );
}
