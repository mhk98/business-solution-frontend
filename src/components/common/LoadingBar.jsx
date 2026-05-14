import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

const LoadingBar = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const hideRef = useRef(null);
  const prevPath = useRef(location.pathname + location.search);

  useEffect(() => {
    const currentPath = location.pathname + location.search;
    if (currentPath === prevPath.current) return;
    prevPath.current = currentPath;

    clearInterval(timerRef.current);
    clearTimeout(hideRef.current);
    setVisible(true);
    setProgress(30);

    timerRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 85) return p;
        return p + Math.random() * 12;
      });
    }, 200);

    const complete = setTimeout(() => {
      clearInterval(timerRef.current);
      setProgress(100);
      hideRef.current = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 350);
    }, 500);

    return () => {
      clearTimeout(complete);
      clearInterval(timerRef.current);
    };
  }, [location]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] h-[3px] bg-transparent pointer-events-none">
      <div
        className="h-full bg-indigo-500 transition-all duration-200 ease-out shadow-[0_0_8px_rgba(99,102,241,0.6)]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default LoadingBar;
