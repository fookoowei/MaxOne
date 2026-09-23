// A template re-mounts on every navigation (a layout does not), which is exactly the hook a
// screen-enter animation needs: each page slides in from the right like a navigation stack.
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
