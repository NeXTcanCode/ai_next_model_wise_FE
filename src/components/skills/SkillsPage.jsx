import React, { useEffect, useMemo, useState } from "react";
import { FileText, Plus, Save, Sparkles, Trash2 } from "lucide-react";
import { api } from "../../lib/api";

const builtIns = [
  {
    id: "builtin-summarise",
    name: "Summarise",
    markdown:
      "# Summarise\n\nCreate a clear summary of the text I provide. Include the key points, decisions, and action items.",
  },
  {
    id: "builtin-rewrite",
    name: "Rewrite",
    markdown:
      "# Rewrite\n\nRewrite the text I provide to make it clearer, more polished, and appropriate for its intended audience.",
  },
  {
    id: "builtin-explain",
    name: "Explain",
    markdown:
      "# Explain\n\nExplain the topic or text I provide clearly, adapting the depth to the audience.",
  },
  {
    id: "builtin-translate",
    name: "Translate",
    markdown:
      "# Translate\n\nTranslate the text I provide while preserving its meaning, tone, and formatting.",
  },
  {
    id: "builtin-debug",
    name: "Debug",
    markdown:
      "# Debug\n\nHelp diagnose the code I provide, explain the root cause, and suggest a verified fix.",
  },
  {
    id: "builtin-generate-tests",
    name: "Generate tests",
    markdown:
      "# Generate tests\n\nGenerate useful unit and edge-case tests for the code I provide.",
  },
];

export default function SkillsPage() {
  const [customSkills, setCustomSkills] = useState([]);
  const [selected, setSelected] = useState(builtIns[0]);
  const [draft, setDraft] = useState(builtIns[0].markdown);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newMarkdown, setNewMarkdown] = useState("# My skill\n\n");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    api("/api/v1/skills")
      .then((data) => setCustomSkills(data.skills || []))
      .catch(() => {});
    if (sessionStorage.getItem("next_ai_create_skill") === "true") {
      setCreating(true);
      sessionStorage.removeItem("next_ai_create_skill");
    }
  }, []);
  const selectSkill = (skill) => {
    setSelected(skill);
    setDraft(skill.markdown);
    setCreating(false);
  };
  const createSkill = async (event) => {
    event.preventDefault();
    if (!newName.trim() || !newMarkdown.trim() || saving) return;
    setSaving(true);
    try {
      const data = await api("/api/v1/skills", {
        method: "POST",
        body: JSON.stringify({ name: newName, markdown: newMarkdown }),
      });
      setCustomSkills((current) => [data.skill, ...current]);
      selectSkill(data.skill);
      setNewName("");
      setNewMarkdown("# My skill\n\n");
    } finally {
      setSaving(false);
    }
  };
  const saveSkill = async () => {
    if (selected.id.startsWith("builtin-") || saving) return;
    setSaving(true);
    try {
      const data = await api(`/api/v1/skills/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ markdown: draft }),
      });
      setSelected(data.skill);
      setCustomSkills((current) =>
        current.map((skill) =>
          skill.id === data.skill.id ? data.skill : skill
        )
      );
    } finally {
      setSaving(false);
    }
  };
  const deleteSkill = async () => {
    if (
      selected.id.startsWith("builtin-") ||
      !window.confirm(`Delete ${selected.name}?`)
    )
      return;
    await api(`/api/v1/skills/${selected.id}`, { method: "DELETE" });
    setCustomSkills((current) =>
      current.filter((skill) => skill.id !== selected.id)
    );
    selectSkill(builtIns[0]);
  };
  return (
    <section className="skills-page">
      <aside className="skills-page__list">
        {/* <div className="skills-page__list-title">
          <Sparkles size={17} />
          <b>Skills</b>
        </div> */}
        <button
          type="button"
          className="skills-page__create"
          onClick={() => setCreating(true)}
        >
          <Plus size={16} /> Create skill
        </button>
        <small>BUILT-IN SKILLS</small>
        {builtIns.map((skill) => (
          <SkillListItem
            key={skill.id}
            skill={skill}
            selected={selected.id === skill.id}
            onClick={selectSkill}
          />
        ))}
        {customSkills.length > 0 && <small>MY SKILLS</small>}
        {customSkills.map((skill) => (
          <SkillListItem
            key={skill.id}
            skill={skill}
            selected={selected.id === skill.id}
            onClick={selectSkill}
          />
        ))}
      </aside>
      <div className="skills-page__editor">
        {creating ? (
          <form onSubmit={createSkill}>
            <span className="eyebrow">NEW SKILL</span>
            <h2>Create a skill</h2>
            <input
              required
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="Skill name"
            />
            <textarea
              required
              value={newMarkdown}
              onChange={(event) => setNewMarkdown(event.target.value)}
              aria-label="New skill Markdown"
            />
            <div className="skills-page__actions">
              <button
                type="button"
                className="secondary"
                onClick={() => setCreating(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="primary small" disabled={saving}>
                <Save size={15} /> {saving ? "Saving…" : "Save skill"}
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="skills-page__editor-heading">
              <div>
                <span className="eyebrow">
                  {selected.id.startsWith("builtin-")
                    ? "BUILT-IN SKILL"
                    : "MY SKILL"}
                </span>
                <h2>{selected.name}</h2>
              </div>
              {!selected.id.startsWith("builtin-") && (
                <button
                  type="button"
                  className="delete"
                  onClick={deleteSkill}
                  title="Delete skill"
                  disabled={saving}
                >
                  <Trash2 size={17} />
                </button>
              )}
            </div>
            <textarea
              className="skills-page__markdown-editor"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              readOnly={selected.id.startsWith("builtin-") || saving}
              aria-label={`${selected.name} Markdown`}
            />
            <div className="skills-page__actions">
              {selected.id.startsWith("builtin-") ? (
                <p>Built-in skills are read-only.</p>
              ) : (
                <button
                  type="button"
                  className="primary small"
                  onClick={saveSkill}
                  disabled={saving}
                >
                  <Save size={15} /> {saving ? "Saving…" : "Save changes"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
function SkillListItem({ skill, selected, onClick }) {
  return (
    <button
      type="button"
      className={selected ? "skills-page__item active" : "skills-page__item"}
      onClick={() => onClick(skill)}
    >
      <FileText size={15} />
      <span>{skill.name}</span>
    </button>
  );
}
