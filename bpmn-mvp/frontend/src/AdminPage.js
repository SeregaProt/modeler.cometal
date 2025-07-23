import React, { useEffect, useState } from "react";

export default function AdminPage({ goHome }) {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState("");
  const [userId, setUserId] = useState("");
  useEffect(() => {
    fetch("http://localhost:4000/api/users")
      .then(r => r.json())
      .then(setUsers);
    fetch("http://localhost:4000/api/projects")
      .then(r => r.json())
      .then(setProjects);
  }, []);
  return (
    <div style={{ padding: 24 }}>
      <button onClick={goHome}>Назад</button>
      <h2>Управление пользователями</h2>
      <h4>Добавить пользователя</h4>
      <UserForm onSuccess={() => window.location.reload()} />
      <h4>Назначить пользователя на проект</h4>
      <select value={projectId} onChange={e => setProjectId(e.target.value)}>
        <option value="">Выберите проект</option>
        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
      <select value={userId} onChange={e => setUserId(e.target.value)}>
        <option value="">Выберите пользователя</option>
        {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
      </select>
      <button disabled={!projectId || !userId} onClick={() => {
        fetch("http://localhost:4000/api/project-users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ project_id: projectId, user_id: userId })
        }).then(() => window.location.reload());
      }}>Назначить</button>
      <h3>Пользователи</h3>
      <ul>
        {users.map(u => <li key={u.id}>{u.name} — {u.email} — {u.role}</li>)}
      </ul>
    </div>
  );
}

function UserForm({ onSuccess }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("editor");
  return (
    <form onSubmit={e => {
      e.preventDefault();
      fetch("http://localhost:4000/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role })
      }).then(onSuccess);
    }}>
      <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
      <input placeholder="Имя" value={name} onChange={e => setName(e.target.value)} />
      <select value={role} onChange={e => setRole(e.target.value)}>
        <option value="admin">admin</option>
        <option value="editor">editor</option>
        <option value="viewer">viewer</option>
      </select>
      <button type="submit">Добавить</button>
    </form>
  );
}
