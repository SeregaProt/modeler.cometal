import React, { useEffect, useState } from "react";

export default function ProjectPage({ projectId, onOpenProcess, goHome }) {
  const [processes, setProcesses] = useState([]);
  const [name, setName] = useState("");
  useEffect(() => {
    fetch(`http://localhost:4000/api/projects/${projectId}/processes`)
      .then((r) => r.json())
      .then(setProcesses);
  }, [projectId]);
  return (
    <div style={{ padding: 24 }}>
      <button onClick={goHome}>Назад</button>
      <h2>Процессы проекта</h2>
      <ul>
        {processes.map((p) => (
          <li key={p.id}>
            {p.name} — <button onClick={() => onOpenProcess(p.id)}>Открыть</button>
          </li>
        ))}
      </ul>
      <input placeholder="Название процесса" value={name} onChange={e => setName(e.target.value)} />
      <button onClick={() => {
        fetch("http://localhost:4000/api/processes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, project_id: projectId, bpmn: "" })
        })
        .then(() => window.location.reload());
      }}>Создать процесс</button>
    </div>
  );
}
