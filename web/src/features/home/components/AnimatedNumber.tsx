import React from "react";

const countFormatter = new Intl.NumberFormat("ko-KR");

type AnimatedNumberProps = {
  value: number;
  format?: (value: number) => string;
};

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  format = (val) => countFormatter.format(val),
}) => {
  const [displayValue, setDisplayValue] = React.useState(value);
  const frameRef = React.useRef<number | null>(null);
  const displayRef = React.useRef(value);

  React.useEffect(() => {
    if (displayRef.current === value) return;
    const start = displayRef.current;
    const diff = value - start;
    const duration = 650;
    const startedAt = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = Math.round(start + diff * eased);
      displayRef.current = nextValue;
      setDisplayValue(nextValue);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      }
    };

    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = requestAnimationFrame(tick);

    return () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
  }, [value]);

  return <span>{format(displayValue)}</span>;
};

export default AnimatedNumber;
