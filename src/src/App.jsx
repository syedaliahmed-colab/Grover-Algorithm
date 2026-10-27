import React, { useState, useMemo } from 'react';
import { Play, RotateCcw, ChevronRight, BookOpen, Cpu, BarChart2, Info, ArrowRight, Code } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function GroverSimulator() {
  // Config state
  const [numQubits, setNumQubits] = useState(3);
  const [targetState, setTargetState] = useState(5); // default state |101>
  const [currentStep, setCurrentStep] = useState(0); // 0: Init, 1: Oracle, 2: Diffuser, etc.
  const [activeTab, setActiveTab] = useState('simulation'); // 'simulation', 'theory', 'circuit', 'code'

  const N = Math.pow(2, numQubits);
  const optimalIterations = Math.round((Math.PI / 4) * Math.sqrt(N));

  // Step history state representation
  // Each step tracks: amplitude vector, phase vector, step description
  const computeSteps = useMemo(() => {
    const steps = [];
    const size = Math.pow(2, numQubits);
    const target = Math.min(targetState, size - 1);

    // Step 0: Equal Superposition
    let amplitudes = new Array(size).fill(1 / Math.sqrt(size));
    steps.push({
      name: "Initialization (Hadamard)",
      type: "init",
      description: "Apply Hadamard gates to all qubits to create equal superposition state |s⟩.",
      amplitudes: [...amplitudes],
      iteration: 0
    });

    let currentAmp = [...amplitudes];

    for (let iter = 1; iter <= optimalIterations + 1; iter++) {
      // Step A: Oracle Phase Flip
      currentAmp = currentAmp.map((amp, idx) => (idx === target ? -amp : amp));
      steps.push({
        name: `Iteration ${iter}: Oracle (U_w)`,
        type: "oracle",
        description: `Apply Oracle phase inversion. Target state |${target.toString(2).padStart(numQubits, '0')}⟩ phase is flipped by π (multiplied by -1).`,
        amplitudes: [...currentAmp],
        iteration: iter
      });

      // Step B: Diffusion Operator (Inversion about average)
      const mean = currentAmp.reduce((acc, val) => acc + val, 0) / size;
      currentAmp = currentAmp.map(amp => 2 * mean - amp);
      steps.push({
        name: `Iteration ${iter}: Diffusion (D)`,
        type: "diffuser",
        description: `Apply Diffusion operator (Inversion about mean μ = ${mean.toFixed(3)}). Amplitudes shift to 2μ - α_i.`,
        amplitudes: [...currentAmp],
        iteration: iter
      });
    }

    return steps;
  }, [numQubits, targetState, optimalIterations]);

  const activeStep = computeSteps[Math.min(currentStep, computeSteps.length - 1)];

  // Chart data formatting
  const chartData = useMemo(() => {
    if (!activeStep) return [];
    return activeStep.amplitudes.map((amp, idx) => {
      const prob = amp * amp;
      const binStr = idx.toString(2).padStart(numQubits, '0');
      return {
        state: `|${binStr}⟩`,
        index: idx,
        amplitude: amp,
        probability: prob,
        isTarget: idx === targetState
      };
    });
  }, [activeStep, numQubits, targetState]);

  // Dynamic Qiskit Code Generator
  const qiskitCode = useMemo(() => {
    const targetBin = targetState.toString(2).padStart(numQubits, '0');
    return `# Grover's Algorithm Simulation for Master's Quantum Mechanics Course
# Quantum State Space Size: N = ${N} (${numQubits} Qubits)
# Target Marked State: |${targetBin}⟩ (Index ${targetState})

from qiskit import QuantumCircuit, Aer, execute
from qiskit.visualization import plot_histogram
import numpy as np

n = ${numQubits}
target_index = ${targetState}
target_bin = "${targetBin}"
k_opt = int(np.round(np.pi / 4 * np.sqrt(2**n)))

qc = QuantumCircuit(n, n)

# 1. Initialize Equal Superposition |s>
qc.h(range(n))
qc.barrier()

def apply_oracle(circuit):
    # Phase Flip for Target State |${targetBin}⟩
    for q in range(n):
        if target_bin[n - 1 - q] == '0':
            circuit.x(q)
    circuit.h(n - 1)
    circuit.mcx(list(range(n - 1)), n - 1)
    circuit.h(n - 1)
    for q in range(n):
        if target_bin[n - 1 - q] == '0':
            circuit.x(q)

def apply_diffuser(circuit):
    circuit.h(range(n))
    circuit.x(range(n))
    circuit.h(n - 1)
    circuit.mcx(list(range(n - 1)), n - 1)
    circuit.h(n - 1)
    circuit.x(range(n))
    circuit.h(range(n))

# 2. Iterate Grover Operator k_opt times
for _ in range(k_opt):
    apply_oracle(qc)
    qc.barrier()
    apply_diffuser(qc)
    qc.barrier()

# 3. Measurement
qc.measure(range(n), range(n))

print(f"Optimal iterations k_opt = {k_opt}")
`;
  }, [numQubits, targetState, N]);

  // Geometric Rotation Angles Calculation
  const theta = 2 * Math.asin(1 / Math.sqrt(N));
  const currentIterNum = activeStep ? activeStep.iteration : 0;
  const currentAngle = (2 * currentIterNum + 1) * (theta / 2);
  const currentAngleDeg = (currentAngle * (180 / Math.PI)).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8">
      {/* Header */}
      <header className="max-w-7xl mx-mx-auto mb-8 border-b border-slate-800 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Cpu className="text-cyan-400 w-8 h-8" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Grover's Quantum Search Simulator
            </h1>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Master's Level Quantum Mechanics Interactive Laboratory
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
          {[
            { id: 'simulation', label: 'Simulator', icon: BarChart2 },
            { id: 'theory', label: 'Theory & Geometry', icon: BookOpen },
            { id: 'circuit', label: 'Circuit Diagram', icon: Cpu },
            { id: 'code', label: 'Qiskit Export', icon: Code }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Sidebar Controls (4 columns) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-sm">
            <h2 className="text-lg font-semibold text-cyan-400 mb-4 flex items-center gap-2">
              <Info className="w-5 h-5" /> Quantum System Parameters
            </h2>

            {/* Qubit Selector */}
            <div className="space-y-3 mb-6">
              <label className="text-sm font-medium text-slate-300 flex justify-between">
                <span>Number of Qubits (n):</span>
                <span className="text-cyan-400 font-mono font-bold">{numQubits} Qubits</span>
              </label>
              <input
                type="range"
                min="2"
                max="5"
                value={numQubits}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  setNumQubits(val);
                  setTargetState(Math.min(targetState, Math.pow(2, val) - 1));
                  setCurrentStep(0);
                }}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-xs text-slate-500 font-mono">
                <span>n=2 (N=4)</span>
                <span>n=3 (N=8)</span>
                <span>n=4 (N=16)</span>
                <span>n=5 (N=32)</span>
              </div>
            </div>

            {/* Target State Selector */}
            <div className="space-y-3 mb-6">
              <label className="text-sm font-medium text-slate-300 flex justify-between">
                <span>Target Search State |w⟩:</span>
                <span className="text-cyan-40
