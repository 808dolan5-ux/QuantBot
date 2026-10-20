import { useEffect, useRef, useState } from 'react';

// Typing stays local so the page doesn't re-render on every key; the value is sent up after a short pause or on blur.
// Only an outside change (not our own commit coming back) resets the box, so keys typed after a commit are never lost.
export default function LazyField({ as: Comp, value, onCommit, ...props }) {
  const [text, setText] = useState(value);
  const timer = useRef();
  const sent = useRef(value);
  useEffect(() => {
    if (value !== sent.current) { sent.current = value; setText(value); }
  }, [value]);
  useEffect(() => () => clearTimeout(timer.current), []);
  const commit = (v) => {
    clearTimeout(timer.current);
    if (v === sent.current) return;
    sent.current = v;
    onCommit(v);
  };
  return (
    <Comp
      {...props} value={text}
      onChange={(e) => { const v = e.target.value; setText(v); clearTimeout(timer.current); timer.current = setTimeout(() => commit(v), 400); }}
      onBlur={(e) => commit(e.target.value)}
    />
  );
}