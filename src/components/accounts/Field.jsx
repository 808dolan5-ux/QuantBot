import { Children, cloneElement, isValidElement, useId } from 'react';
import { Label } from '@/components/ui/label';

// Links the label to its input so clicking the label focuses the right field
export default function Field({ label, hint, children }) {
  const id = useId();
  let linked = false;
  const kids = Children.map(children, (c) => {
    if (linked || !isValidElement(c) || c.type === 'datalist') return c;
    linked = true;
    return cloneElement(c, { id: c.props.id || id, autoComplete: c.props.autoComplete || 'off' });
  });
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      {kids}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}