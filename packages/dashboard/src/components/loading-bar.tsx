import { useIsFetching } from '@tanstack/react-query';

export function LoadingBar() {
  const isFetching = useIsFetching();

  if (!isFetching) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/20">
      <div className="h-full w-1/3 animate-[loading-bar_1.5s_ease-in-out_infinite] bg-primary" />
      <style>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(200%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
