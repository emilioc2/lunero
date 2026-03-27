export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAF9',
        padding: '24px 16px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 520 }}>{children}</div>
    </div>
  );
}
