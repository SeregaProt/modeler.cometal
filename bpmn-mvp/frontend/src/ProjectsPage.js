import React, { useEffect, useState } from "react";

export default function ProjectsPage({ onSelectProject, onAdmin }) {
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState("");
  useEffect(() => {
    fetch("http://localhost:4000/api/projects")
      .then((r) => r.json())
      .then(setProjects);
  }, []);
  return (
    <div style={{ padding: 24 }}>
      <h1>Проекты</h1>
      <button onClick={onAdmin}>Админка</button>
      <ul>
        {projects.map((p) => (
          <li key={p.id}>
            <b>{p.name}</b> — <button onClick={() => onSelectProject(p.id)}>Войти</button>
          </li>
        ))}
      </ul>
      <input placeholder="Новый проект" value={name} onChange={e => setName(e.target.value)} />
      <button onClick={() => {
        fetch("http://localhost:4000/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name })
        })
        .then(() => window.location.reload());
      }}>Создать</button>
    </div>
  );
}
