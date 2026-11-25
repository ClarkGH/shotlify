import { useId, type ButtonHTMLAttributes, type MouseEvent } from "react";

import styles from "./Button.module.css";

/* main = dark face. secondary = light face with a dark rim. onDark = light
 * face for dark backgrounds (the viewer). All lift and show the turning
 * gradient rim on hover/focus (design canvas). */
export type ButtonVariant = "main" | "secondary" | "onDark";

/* small (44px, the WCAG 2.5.8 floor we hold to) for tight spots like
 * remove buttons on frame tiles; regular (48px) everywhere else. */
export type ButtonSize = "regular" | "small";

/* `disabled` is left out on purpose: a disabled button drops out of the
 * tab order, and its reason goes with it. Pass `disabledReason` instead;
 * the button stays focusable, gets aria-disabled, and says why. */
export type ButtonProps =
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled"> & {
    variant: ButtonVariant;
    size?: ButtonSize;
    disabledReason?: string;
  };

/* Joins ids/classes, skipping empty ones. */
const join = (...parts: (string | undefined)[]): string | undefined => {
  const joined = parts.filter(Boolean).join(" ");
  return joined || undefined;
};

/* Any defined disabledReason blocks the button, even an empty one, so a
 * caller can never unblock it by accident. Only a non-blank reason is
 * announced. */
const Button = ({
  variant,
  size = "regular",
  disabledReason,
  className,
  type = "button",
  onClick,
  children,
  "aria-describedby": describedBy,
  ...rest
}: ButtonProps): JSX.Element => {
  const reasonId = useId();
  const blocked = disabledReason !== undefined;
  const hasReason = blocked && disabledReason.trim() !== "";

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (blocked) {
      // Stops form submits and the caller's handler; Enter and Space
      // arrive here as clicks too.
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <>
      <button
        {...rest}
        type={type}
        className={join(styles.button, className)}
        data-variant={variant}
        data-size={size}
        aria-disabled={blocked || undefined}
        aria-describedby={join(describedBy, hasReason ? reasonId : undefined)}
        onClick={handleClick}
      >
        {children}
      </button>
      {/* `hidden`, not sr-only: aria-describedby still reads a hidden
       * element, but hidden keeps the reason out of the reading order, so
       * a screen reader browsing the page doesn't hit it as stray text
       * after the button. */}
      {hasReason && (
        <span id={reasonId} hidden>
          {disabledReason}
        </span>
      )}
    </>
  );
};

export default Button;
