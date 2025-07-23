import React, { useEffect, useRef } from "react";
import BpmnJS from "bpmn-js/dist/bpmn-modeler.production.min.js";

export default function ProcessEditor({ processId, goBack }) {
  const ref = useRef();
  const modeler = useRef();

  useEffect(() => {
    modeler.current = new BpmnJS({ container: ref.current });
    fetch(`http://localhost:4000/api/processes/${processId}`)
      .then(r => r.json())
      .then(proc => {
        if (proc.bpmn)
          modeler.current.importXML(proc.bpmn);
        else
          modeler.current.createDiagram();
      });

    return () => {
      modeler.current.destroy();
    };
  }, [processId]);

  const save = () => {
    modeler.current.saveXML({ format: true }, (err, xml) => {
      fetch(`http://localhost:4000/api/processes/${processId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bpmn: xml })
      });
      alert("Сохранено!");
    });
  };

  return (
    <div style={{ padding: 24 }}>
      <button onClick={goBack}>Назад</button>
      <button onClick={save}>Сохранить</button>
      <div ref={ref} style={{ height: 600, border: "1px solid #888" }} />
    </div>
  );
}
