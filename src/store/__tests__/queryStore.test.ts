import { beforeEach, describe, expect, it } from "vitest";
import { useQueryStore } from "@/store/queryStore";
import { createRootGroup } from "@/lib/tree";
import { isGroup } from "@/lib/types";

function reset() {
  useQueryStore.setState({
    sourceId: "users",
    root: createRootGroup(),
    past: [],
    future: [],
    saved: [],
  });
}

describe("queryStore", () => {
  beforeEach(reset);

  it("adds and removes rules", () => {
    const { addRule } = useQueryStore.getState();
    const rootId = useQueryStore.getState().root.id;
    addRule(rootId);
    expect(useQueryStore.getState().root.children).toHaveLength(2);

    const childId = useQueryStore.getState().root.children[0].id;
    useQueryStore.getState().removeNodeById(childId);
    expect(useQueryStore.getState().root.children).toHaveLength(1);
  });

  it("adds nested groups", () => {
    const rootId = useQueryStore.getState().root.id;
    useQueryStore.getState().addGroup(rootId);
    const added = useQueryStore.getState().root.children.find((c) => isGroup(c));
    expect(added).toBeDefined();
  });

  it("supports undo/redo", () => {
    const rootId = useQueryStore.getState().root.id;
    useQueryStore.getState().addRule(rootId);
    expect(useQueryStore.getState().root.children).toHaveLength(2);

    useQueryStore.getState().undo();
    expect(useQueryStore.getState().root.children).toHaveLength(1);

    useQueryStore.getState().redo();
    expect(useQueryStore.getState().root.children).toHaveLength(2);
  });

  it("resets operator and value when field changes", () => {
    const ruleId = useQueryStore.getState().root.children[0].id;
    const s = useQueryStore.getState();
    s.setField(ruleId, "age");
    s.setOperator(ruleId, "gt");
    s.setValue(ruleId, 18);
    s.setField(ruleId, "name");
    const rule = useQueryStore.getState().root.children[0];
    expect(rule.type === "rule" && rule.operator).toBeNull();
    expect(rule.type === "rule" && rule.value).toBe("");
  });

  it("saves, loads and deletes presets", () => {
    const rootId = useQueryStore.getState().root.id;
    useQueryStore.getState().addRule(rootId);
    useQueryStore.getState().savePreset("two-rules");
    const presetId = useQueryStore.getState().saved[0].id;

    useQueryStore.getState().reset();
    expect(useQueryStore.getState().root.children).toHaveLength(1);

    useQueryStore.getState().loadPreset(presetId);
    expect(useQueryStore.getState().root.children).toHaveLength(2);

    useQueryStore.getState().deletePreset(presetId);
    expect(useQueryStore.getState().saved).toHaveLength(0);
  });
});
