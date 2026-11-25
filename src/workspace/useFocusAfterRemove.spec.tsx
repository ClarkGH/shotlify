// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { describe, expect, it } from "vitest";

import { useFocusAfterRemove } from "./useFocusAfterRemove";

type Item = { id: string };

/* A bare list using the hook. `ignoreRemove` makes the parent refuse the
 * removal, to check focus isn't moved later by an unrelated change. */
const List = ({
  initial,
  ignoreRemove = false,
}: {
  initial: string[];
  ignoreRemove?: boolean;
}) => {
  const [items, setItems] = useState<Item[]>(initial.map((id) => ({ id })));
  const listRef = useRef<HTMLUListElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const prepare = useFocusAfterRemove(items, {
    listRef,
    fallbackRef: headingRef,
    attribute: "data-item-id",
  });

  const remove = (id: string) => {
    if (!prepare(id) || ignoreRemove) return;
    setItems((list) => list.filter((item) => item.id !== id));
  };

  return (
    <>
      <h2 ref={headingRef} tabIndex={-1}>Items</h2>
      <button
        type="button"
        onClick={() => setItems((list) => [...list, { id: "new" }])}
      >
        add
      </button>
      <ul ref={listRef}>
        {items.map((item) => (
          <li key={item.id} data-item-id={item.id}>
            <button type="button">{`open ${item.id}`}</button>
            <button type="button" onClick={() => remove(item.id)}>
              {`remove ${item.id}`}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
};

const button = (name: string) => screen.getByRole("button", { name });

describe("useFocusAfterRemove", () => {
  it("focuses the first button of the item that slides into place", () => {
    render(<List initial={["a", "b", "c"]} />);

    fireEvent.click(button("remove b"));

    expect(document.activeElement).toBe(button("open c"));
  });

  it("focuses the previous item when the last one goes", () => {
    render(<List initial={["a", "b"]} />);

    fireEvent.click(button("remove b"));

    expect(document.activeElement).toBe(button("open a"));
  });

  it("focuses the fallback when the list empties", () => {
    render(<List initial={["a"]} />);

    fireEvent.click(button("remove a"));

    expect(document.activeElement).toBe(
      screen.getByRole("heading", { name: "Items" }),
    );
  });

  it("matches ids exactly, not by prefix", () => {
    render(<List initial={["a", "ab", "b"]} />);

    fireEvent.click(button("remove ab"));

    expect(document.activeElement).toBe(button("open b"));
  });

  it("doesn't move focus later if the parent ignored the removal", () => {
    render(<List initial={["a", "b"]} ignoreRemove />);

    fireEvent.click(button("remove a"));
    button("add").focus();
    fireEvent.click(button("add"));

    expect(document.activeElement).toBe(button("add"));
  });
});
