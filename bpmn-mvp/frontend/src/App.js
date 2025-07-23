import React, { useState } from "react";
import ProjectsPage from "./ProjectsPage";
import ProjectPage from "./ProjectPage";
import ProcessEditor from "./ProcessEditor";
import AdminPage from "./AdminPage";

export default function App() {
  const [view, setView] = useState("projects");
  const [projectId, setProjectId] = useState(null);
  const [processId, setProcessId] = useState(null);

  if (view === "admin") return <AdminPage goHome={() => setView("projects")} />;
  if (view === "projects")
    return (
      <ProjectsPage
        onSelectProject={(id) => {
          setProjectId(id);
          setView("project");
        }}
        onAdmin={() => setView("admin")}
      />
    );
  if (view === "project")
    return (
      <ProjectPage
        projectId={projectId}
        onOpenProcess={(pid) => {
          setProcessId(pid);
          setView("process");
        }}
        goHome={() => setView("projects")}
      />
    );
  if (view === "process")
    return (
      <ProcessEditor
        processId={processId}
        goBack={() => setView("project")}
      />
    );
}
