import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

// While `active`: focus moves to the first control inside the container,
// Tab and Shift+Tab cycle within it (plus any `extra` elements that should
// stay reachable, such as the button that closes it), and focus goes back to
// whatever had it before when the trap ends.
export function useFocusTrap(
  container: RefObject<HTMLElement>,
  active: boolean,
  extra: RefObject<HTMLElement>[] = [],
  // Put focus on the container itself, not its first control, so no control
  // shows a focus ring just because a menu was opened by touch.
  focusContainer = false,
) {
  useEffect(() => {
    if (!active) return;
    const root = container.current;
    if (!root) return;

    const opener = document.activeElement as HTMLElement | null;
    const items = () => {
      const inside = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
      const outside = extra.map((r) => r.current).filter((el): el is HTMLElement => Boolean(el));
      return [...inside, ...outside];
    };

    const first = root.querySelector<HTMLElement>(FOCUSABLE);
    (focusContainer ? root : (first ?? root)).focus({ preventScroll: true });

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const list = items();
      if (list.length === 0) return;
      const start = list[0];
      const end = list[list.length - 1];
      const current = document.activeElement;
      if (e.shiftKey && current === start) {
        e.preventDefault();
        end.focus();
      } else if (!e.shiftKey && current === end) {
        e.preventDefault();
        start.focus();
      } else if (!list.includes(current as HTMLElement)) {
        e.preventDefault();
        start.focus();
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      opener?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);
}
