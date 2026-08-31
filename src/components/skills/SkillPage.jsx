import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { api } from "../../lib/api";

const builtIns = {
  summarise: { name: "Summarise", markdown: "# Summarise\n\nCreate a clear summary of the text I provide. Include the key points, decisions, and action items." },
  rewrite: { name: "Rewrite", markdown: "# Rewrite\n\nRewrite the text I provide to make it clearer, more polished, and appropriate for its intended audience." },
  explain: { name: "Explain", markdown: "# Explain\n\nExplain the topic or text I provide clearly, adapting the depth to the audience." },
  translate: { name: "Translate", markdown: "# Translate\n\nTranslate the text I provide while preserving its meaning, tone, and formatting." },
  debug: { name: "Debug", markdown: "# Debug\n\nHelp diagnose the code I provide, explain the root cause, and suggest a verified fix." },
  "generate-tests": { name: "Generate tests", markdown: "# Generate tests\n\nGenerate useful unit and edge-case tests for the code I provide." },
};

export default function SkillPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [skill, setSkill] = useState(builtIns[location.pathname.slice(1)] || null);
  useEffect(() => {
    if (location.pathname.startsWith("/skills/")) api(`/api/v1/skills/${location.pathname.split("/").pop()}`).then((data) => setSkill(data.skill)).catch(() => setSkill(null));
  }, [location.pathname]);
  if (!skill) return <section className="page-panel"><h2>Skill not found</h2></section>;
  const useSkill = () => { sessionStorage.setItem("next_ai_skill_prompt", skill.markdown.replace(/^#.*\n\n?/, "")); navigate("/next_ai"); };
  return <section className="page-panel skill-page"><div className="skill-page__icon"><Sparkles size={22} /></div><span className="eyebrow">SKILL</span><h2>{skill.name}</h2>{skill.description && <p>{skill.description}</p>}<article className="skill-page__markdown">{skill.markdown.split("\n").map((line, index) => <p key={index}>{line || "\u00a0"}</p>)}</article><button type="button" className="primary small" onClick={useSkill}>Use this skill <ArrowRight size={16} /></button></section>;
}
