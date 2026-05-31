import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { GroupNode } from "@/components/GroupNode";
import { getDataSource } from "@/lib/datasources";
import { createGroup, createRootGroup, createRule } from "@/lib/tree";
import { useQueryStore } from "@/store/queryStore";

const source = getDataSource("users")!;

function reset() {
  useQueryStore.setState({
    sourceId: "users",
    root: createRootGroup(),
    past: [],
    future: [],
    saved: [],
  });
}

function Harness() {
  const root = useQueryStore((s) => s.root);
  return <GroupNode group={root} source={source} issues={new Map()} isRoot />;
}

describe("GroupNode recursive rendering", () => {
  beforeEach(reset);

  it("renders nested groups recursively", () => {
    const nested = createGroup("OR", [createRule(), createGroup("AND", [createRule()])]);
    useQueryStore.setState({ root: createGroup("AND", [nested]) });
    render(<Harness />);
    // Three groups total: root + nested OR + inner AND
    expect(screen.getAllByTestId(/^group-/)).toHaveLength(3);
  });

  it("adds a rule through the store when + Rule is clicked", () => {
    render(<Harness />);
    const before = useQueryStore.getState().root.children.length;
    fireEvent.click(screen.getAllByText("+ Rule")[0]);
    expect(useQueryStore.getState().root.children.length).toBe(before + 1);
  });

  it("adds a nested group when + Group is clicked", () => {
    render(<Harness />);
    fireEvent.click(screen.getAllByText("+ Group")[0]);
    const hasGroup = useQueryStore.getState().root.children.some((c) => c.type === "group");
    expect(hasGroup).toBe(true);
  });

  it("toggles the combinator", () => {
    render(<Harness />);
    fireEvent.click(screen.getAllByText("OR")[0]);
    expect(useQueryStore.getState().root.combinator).toBe("OR");
  });

  it("collapses a group hiding its children", () => {
    render(<Harness />);
    const group = screen.getByTestId(`group-${useQueryStore.getState().root.id}`);
    fireEvent.click(within(group).getByLabelText(/collapse group/i));
    expect(useQueryStore.getState().root.collapsed).toBe(true);
  });
});
