import React from "react";
import { Sparkles } from "lucide-react";

export default function TipCard() {
  return <div className="tip-card"><span className="tip-icon"><Sparkles size={17} /></span><div><b>Better prompts, better picks</b><p>Include the goal, constraints, and what “done” looks like for a more accurate recommendation.</p></div></div>;
}
