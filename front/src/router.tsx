import { Routes, Route } from "react-router-dom";
import ContractAnalysis from "./page/ContractAnalysis"


function Teste(){
    return (<div>Test</div>)
}

function Dashboard(){
    return (<div>Dashboard</div>)
}

export function App() {
  return (
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/about" element={<Teste />} />
      <Route path="/" element={<ContractAnalysis />} />
    </Routes>
  );
}